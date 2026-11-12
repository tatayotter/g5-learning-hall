// Real-phone speed report for the map. Once a day per device, after the map has been on screen
// (not covered by a page) for a few seconds, it measures how smoothly the map runs and sends one
// `perf_sample` analytics event with what kind of phone it is. This is how we learn whether cheap
// phones lag, instead of guessing from a fast test machine.
import { trackEvent } from '@/lib/analytics';

type PerfGame = {
  loop: { actualFps: number };
  canvas: HTMLCanvasElement;
  renderer?: { gl?: WebGLRenderingContext | WebGL2RenderingContext | null } | null;
};

const DAY_KEY = 'g5_perf_report_day';
const WARMUP_MS = 4000; // let the first textures settle before measuring
const SAMPLE_MS = 10000; // how long the map must be measured (uncovered) for one report

// Main-thread freezes since the page opened (long tasks are > 50 ms by definition). Started when
// this module first loads, which is when the map code loads, so it covers most of the start-up.
let longTaskMs = 0;
let longTaskMax = 0;
let longTaskCount = 0;
if (typeof window !== 'undefined' && typeof PerformanceObserver !== 'undefined') {
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        longTaskMs += e.duration;
        longTaskCount++;
        if (e.duration > longTaskMax) longTaskMax = e.duration;
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch { /* not supported (Safari) */ }
}

const manilaDay = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);

function gpuName(game: PerfGame): string | null {
  try {
    const gl = game.renderer?.gl ?? null;
    if (!gl) return 'canvas';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return typeof name === 'string' ? name.slice(0, 120) : null;
  } catch {
    return null;
  }
}

async function phoneModel(): Promise<string | null> {
  try {
    const uad = (navigator as Navigator & { userAgentData?: { getHighEntropyValues?: (h: string[]) => Promise<{ model?: string; platformVersion?: string }> } }).userAgentData;
    if (!uad?.getHighEntropyValues) return null;
    const v = await uad.getHighEntropyValues(['model']);
    return v.model ? v.model.slice(0, 60) : null;
  } catch {
    return null;
  }
}

/**
 * Starts the once-a-day map speed report. `isPaused` says whether a page covers the map (the
 * game loop sleeps then, so those seconds are skipped). Returns a cancel function.
 */
export function startMapPerfReport(game: PerfGame, opts: { sharp: number; forced: boolean; isPaused: () => boolean; mapStartMs: number }) {
  try {
    if (localStorage.getItem(DAY_KEY) === manilaDay()) return () => {};
  } catch {
    return () => {}; // private mode: skip rather than report every load
  }

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let raf = 0;
  const startWidth = game.canvas.width;
  let uncoveredMs = 0;
  const fps: number[] = [];
  let frames = 0, slowFrames = 0, worstFrame = 0, lastFrame = 0;

  const onFrame = (t: number) => {
    if (cancelled) return;
    if (!opts.isPaused() && document.visibilityState === 'visible' && uncoveredMs >= WARMUP_MS) {
      if (lastFrame) {
        const d = t - lastFrame;
        frames++;
        if (d > 50) slowFrames++;
        if (d > worstFrame) worstFrame = d;
      }
      lastFrame = t;
    } else {
      lastFrame = 0;
    }
    raf = requestAnimationFrame(onFrame);
  };
  raf = requestAnimationFrame(onFrame);

  const tick = () => {
    if (cancelled) return;
    if (!opts.isPaused() && document.visibilityState === 'visible') {
      uncoveredMs += 1000;
      if (uncoveredMs > WARMUP_MS) fps.push(game.loop.actualFps);
    }
    if (uncoveredMs < WARMUP_MS + SAMPLE_MS) { timer = setTimeout(tick, 1000); return; }
    cancelAnimationFrame(raf);
    void send();
  };
  timer = setTimeout(tick, 1000);

  const send = async () => {
    try { localStorage.setItem(DAY_KEY, manilaDay()); } catch { /* ignore */ }
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; saveData?: boolean } };
    const sorted = [...fps].sort((a, b) => a - b);
    await trackEvent('perf_sample', {
      where: 'map',
      fps_avg: Math.round(fps.reduce((a, b) => a + b, 0) / Math.max(1, fps.length)),
      fps_low: Math.round(sorted[0] ?? 0),
      frames,
      slow_frames: slowFrames, // frames that took over 50 ms (a visible stutter)
      worst_frame_ms: Math.round(worstFrame),
      sharp_start: opts.sharp,
      sharp_forced: opts.forced,
      fell_back: game.canvas.width < startWidth, // switched to the plain picture for being slow
      canvas_w: game.canvas.width,
      map_start_ms: Math.round(opts.mapStartMs), // from opening the page to the map starting up
      long_task_ms: Math.round(longTaskMs), // total time the phone froze (> 50 ms at a time) since the map code loaded
      long_task_max_ms: Math.round(longTaskMax),
      long_tasks: longTaskCount,
      device_memory_gb: nav.deviceMemory ?? null, // Chrome only, rounded down (0.25-8)
      cores: nav.hardwareConcurrency ?? null,
      dpr: window.devicePixelRatio || 1,
      screen: `${screen.width}x${screen.height}`,
      gpu: gpuName(game),
      model: await phoneModel(),
      net: nav.connection?.effectiveType ?? null,
      save_data: nav.connection?.saveData ?? null,
    }, 'board');
  };

  return () => {
    cancelled = true;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
  };
}
