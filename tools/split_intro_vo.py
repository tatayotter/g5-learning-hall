"""Split one ElevenLabs take (several intro voice lines read in a row) into
per-line clips at public/sounds/voice/intro/<id>.mp3, and verify each clip.

    python tools/split_intro_vo.py <take.mp3> <id1> <id2> ... [--dry]

The ids must be in the order they were read. Line text comes from
lib/intro/originStory.ts and lib/intro/termBossStory.ts (tags like [whispering] are stripped before matching).

How: faster-whisper transcribes the take with word timestamps; the words are
aligned to the script (difflib) to find where each line starts and ends; each
cut is snapped to the middle of the silence between two lines. Every clip is
then transcribed again and compared with its script line — anything below 85%
similarity is flagged for a listen.
"""
import difflib, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = os.path.join(ROOT, 'marketing', 'tiktok', 'engine', 'node_modules', '@remotion',
                      'compositor-win32-x64-msvc', 'ffmpeg.exe')
OUT_DIR = os.path.join(ROOT, 'public', 'sounds', 'voice', 'intro')
LEAD_S, TAIL_S = 0.12, 0.30


def script_lines():
    src = ''.join(open(os.path.join(ROOT, 'lib', 'intro', f), encoding='utf-8').read()
                  for f in ('originStory.ts', 'termBossStory.ts'))
    pat = re.compile(r"\{ id: '([a-z_0-9]+)', speaker: '\w+', text: '((?:[^'\\]|\\.)*)' \}")
    return {i: t.replace("\\'", "'") for i, t in pat.findall(src)}


def norm_words(text):
    text = re.sub(r'\[[^\]]*\]', ' ', text).lower()
    return re.findall(r"[a-z0-9']+", text)


def silences(path, noise_db=-35, min_s=0.18):
    r = subprocess.run([FFMPEG, '-hide_banner', '-i', path, '-af',
                        f'silencedetect=noise={noise_db}dB:d={min_s}', '-f', 'null', '-'],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r.stderr)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r.stderr)]
    dur = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr)
    total = int(dur.group(1)) * 3600 + int(dur.group(2)) * 60 + float(dur.group(3))
    return list(zip(starts, ends + [total] * (len(starts) - len(ends)))), total


def transcribe(model, path, words=True):
    segs, _ = model.transcribe(path, language='en', word_timestamps=words, beam_size=5)
    if not words:
        return ' '.join(s.text for s in segs)
    return [(w.word, w.start, w.end) for s in segs for w in s.words]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry' in sys.argv
    take, ids = args[0], args[1:]
    texts = script_lines()
    missing = [i for i in ids if i not in texts]
    if missing:
        sys.exit(f'unknown ids: {missing}')

    from faster_whisper import WhisperModel
    model = WhisperModel('small.en', device='cpu', compute_type='int8')

    heard = transcribe(model, take)
    heard_norm = [norm_words(w)[0] if norm_words(w) else '' for w, _, _ in heard]
    script, owner = [], []
    for n, i in enumerate(ids):
        for w in norm_words(texts[i]):
            script.append(w); owner.append(n)
    sm = difflib.SequenceMatcher(a=script, b=heard_norm, autojunk=False)
    first, last = {}, {}
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            n = owner[a + k]
            t0, t1 = heard[b + k][1], heard[b + k][2]
            first.setdefault(n, t0)
            last[n] = max(last.get(n, 0), t1)
    if len(first) != len(ids):
        sys.exit(f'could not locate lines: {[ids[n] for n in range(len(ids)) if n not in first]}')

    sil, total = silences(take)
    cuts = [0.0]
    for n in range(len(ids) - 1):
        gap_a, gap_b = last[n], first[n + 1]
        inside = [(s, e) for s, e in sil if e > gap_a - 0.05 and s < gap_b + 0.05]
        if inside:
            s, e = max(inside, key=lambda x: min(x[1], gap_b) - max(x[0], gap_a))
            cut = (max(s, gap_a) + min(e, gap_b)) / 2
        else:
            cut = (gap_a + gap_b) / 2
        cuts.append(cut)
    cuts.append(total)

    os.makedirs(OUT_DIR, exist_ok=True)
    print(f'{"id":<16}{"start":>7}{"end":>7}  sim  heard')
    worst = 1.0
    for n, i in enumerate(ids):
        # Start where the audio actually comes back after the pause, not at
        # Whisper's first-word time: it doesn't know "Solarch", hears "Clark" /
        # "Mark", and timestamps the line after the "Sol-" (which got cut off).
        onset = [e for _, e in sil if cuts[n] <= e <= first[n] + 0.05]
        # No pause found before the line (e.g. the first line of a take): keep
        # everything from the cut rather than risk clipping the first word.
        start = max(cuts[n], onset[-1] - LEAD_S) if onset else cuts[n]
        # Whisper's last-word end runs early on drawn-out words ("gray!"), so end
        # where the audio actually goes silent after the line, not at that timestamp.
        after = [s for s, _ in sil if s >= last[n] - 0.25 and s < cuts[n + 1]]
        end = min(cuts[n + 1], (after[0] if after else cuts[n + 1]) + TAIL_S)
        out = os.path.join(tempfile.gettempdir(), f'{i}.mp3') if dry else os.path.join(OUT_DIR, f'{i}.mp3')
        subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y', '-i', take,
                        # (Remotion's bundled ffmpeg has no afade; cuts land in silence anyway)
                        '-ss', f'{start:.3f}', '-to', f'{end:.3f}',
                        '-c:a', 'libmp3lame', '-b:a', '96k', out], check=True)
        got = transcribe(model, out, words=False)
        sim = difflib.SequenceMatcher(a=' '.join(norm_words(texts[i])), b=' '.join(norm_words(got))).ratio()
        worst = min(worst, sim)
        flag = '' if sim >= 0.85 else '  <-- LISTEN'
        print(f'{i:<16}{start:7.2f}{end:7.2f}  {sim:.2f} {got.strip()[:70]}{flag}')
    print(f'worst similarity {worst:.2f}; take length {total:.1f}s' + (' (dry run, nothing written)' if dry else f' -> {OUT_DIR}'))


if __name__ == '__main__':
    main()
