/**
 * visualAid.ts
 *
 * Optional structured-diagram spec that content generation can attach to a
 * subject/day entry alongside `summary_markdown` and `quiz`. Rendered by
 * components/quest/VisualAid.tsx as themed inline SVG — no image-gen API,
 * no freeform coordinates/colors in the spec (those live entirely in the
 * renderer, keeping every diagram on-theme by construction).
 *
 * Deliberately a small, closed union — see docs/STYLE_GUIDE.md for the
 * palette these map onto, and the plan this shipped under for why
 * real-world-geography/anatomy shapes (e.g. a literal map) are excluded.
 */

export interface CycleAid {
  type: 'cycle';
  title: string;
  /** 3-6 nodes, rendered in a loop with arrows connecting each to the next (and the last back to the first). */
  nodes: { label: string; icon?: string }[];
}

export interface StepsAid {
  type: 'steps';
  title: string;
  /** Optional starting expression/prompt shown under the title (e.g. a math expression being reduced). */
  expression?: string;
  /** 2-6 ordered steps, rendered top-to-bottom with connecting arrows. */
  steps: { label: string; detail: string }[];
}

export interface BarCompareAid {
  type: 'bar-compare';
  title: string;
  /** 2-3 bars, each split into totalParts equal segments with filledParts shaded. */
  bars: { label: string; totalParts: number; filledParts: number }[];
  /** One-line takeaway shown under the bars (e.g. "3/4 > 2/3"). */
  verdict: string;
}

export type VisualAid = CycleAid | StepsAid | BarCompareAid;
