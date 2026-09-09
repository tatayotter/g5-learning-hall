// lib/gradeColors.ts
// Single source of truth for "which color represents this grade" — used by
// both the Shop's hero gradient (app/parent-dashboard/shop/page.tsx) and the
// child-facing Bonus Quests pack card (components/dashboard/BonusQuestsTab.tsx).
// Previously each file hardcoded its own independent grade->color map (one in
// hex, one as Tailwind class names) that had to be hand-kept in sync; a color
// change now only needs to happen here.
//
// Real Tailwind v4 default hex values (not approximations) for each family's
// 200/400/500 shades, so a consumer needing a light-to-deep two-stop gradient
// (BonusQuestsTab) or a single accent color (Shop, which builds its own
// grade -> category two-tone gradient) can both derive what they need from
// the same row.
export interface GradeColorShades {
  200: string;
  400: string;
  500: string;
}

export const GRADE_COLOR: Record<number, GradeColorShades> = {
  2: { 200: '#fde68a', 400: '#fbbf24', 500: '#f59e0b' }, // amber
  3: { 200: '#a7f3d0', 400: '#34d399', 500: '#10b981' }, // emerald
  4: { 200: '#bae6fd', 400: '#38bdf8', 500: '#0ea5e9' }, // sky
  5: { 200: '#c7d2fe', 400: '#818cf8', 500: '#6366f1' }, // indigo
  6: { 200: '#fecdd3', 400: '#fb7185', 500: '#f43f5e' }, // rose
};

// An unmapped grade still renders a real gradient, just a neutral one — same
// intent as the DEFAULT_GRADIENT_COLOR each consumer used to keep separately.
export const DEFAULT_GRADE_COLOR: GradeColorShades = { 200: '#e2e8f0', 400: '#94a3b8', 500: '#64748b' }; // slate

export function gradeColor(grade: number): GradeColorShades {
  return GRADE_COLOR[grade] ?? DEFAULT_GRADE_COLOR;
}
