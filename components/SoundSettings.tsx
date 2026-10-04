'use client';
// components/SoundSettings.tsx
// Music / Voice / Effects volume sliders in the navigation drawer
// (SidebarRail), replacing the old on/off toggles. The volumes themselves live
// in lib/sounds.ts (persisted per device); this only mirrors them. Letting go
// of the Voice or Effects slider plays a short sample at the new level.
import { useState } from 'react';
import { createVoiceAudio, getVolume, isVoiceEnabled, playPageFlip, setVolume, type VolumeChannel } from '@/lib/sounds';

const CHANNELS: { ch: VolumeChannel; label: string }[] = [
  { ch: 'music', label: 'Music' },
  { ch: 'voice', label: 'Voice' },
  { ch: 'sfx', label: 'Effects' },
];

const VOICE_SAMPLE = '/sounds/voice/rewardsvault_greeting_1.mp3';

function preview(ch: VolumeChannel) {
  if (ch === 'sfx') playPageFlip();
  else if (ch === 'voice' && isVoiceEnabled()) createVoiceAudio(VOICE_SAMPLE).play().catch(() => {});
}

export default function SoundSettings() {
  const [levels, setLevels] = useState<Record<VolumeChannel, number>>(() => ({
    music: Math.round(getVolume('music') * 100),
    voice: Math.round(getVolume('voice') * 100),
    sfx: Math.round(getVolume('sfx') * 100),
  }));

  const change = (ch: VolumeChannel, pct: number) => {
    setVolume(ch, pct / 100);
    setLevels(l => ({ ...l, [ch]: pct }));
  };

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Sound</p>
      <div className="space-y-0.5">
        {CHANNELS.map(({ ch, label }) => (
          <label key={ch} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-[11px] font-bold text-[#6b4820]">{label}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={levels[ch]}
              onChange={e => change(ch, Number(e.target.value))}
              onPointerUp={() => preview(ch)}
              onKeyUp={() => preview(ch)}
              aria-label={`${label} volume`}
              className="flex-1 min-w-0 h-7 accent-[#c9781a] cursor-pointer"
            />
            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-[#6b4820]">
              {levels[ch] === 0 ? 'Off' : `${levels[ch]}%`}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
