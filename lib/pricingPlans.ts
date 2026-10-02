// Single source of truth for Premium pricing copy — read by both the public
// marketing page (app/welcome/pricing) and the signed-in parent page
// (app/parent-dashboard/pricing), so a price or feature change can't drift
// between them. Actual billing amounts are set server-side in
// /api/create-checkout; keep these numbers in sync with it. Child limits
// mirror public.max_children_for_parent: Free = 1, Premium = 3 included +
// up to 2 extra slots (least(5, 3 + addon_children)), checkout caps addons at 2.

export const PREMIUM_PRICE_PHP = 249;
export const PREMIUM_REGULAR_PRICE_PHP = 599;
export const MONTHLY_PER_CHILD_ANCHOR_PHP = 99; // "₱99/month per child" comparison anchor
export const CHILD_SLOT_PRICE_PHP = 99;

/** Yearly Premium price with `addonChildren` extra slots (one-time yearly purchase, not auto-renewing). */
export function premiumRenewalPrice(addonChildren: number): number {
  return PREMIUM_PRICE_PHP + addonChildren * CHILD_SLOT_PRICE_PHP;
}

export interface PlanFeature {
  text: string;
  included: boolean;
}

export const FREE_FEATURES: PlanFeature[] = [
  { text: '1 child account', included: true },
  { text: 'Full gameplay access', included: true },
  { text: 'Progress dashboard and PIN viewing', included: true },
  { text: 'Journal viewing', included: false },
  { text: 'Gold coin rewards', included: false },
  { text: 'Weak-topic reports', included: false },
  { text: 'Compare children side by side', included: false },
];

export const PREMIUM_FEATURES: PlanFeature[] = [
  { text: '3 child accounts included', included: true },
  { text: 'Full gameplay access', included: true },
  { text: 'Journal viewing (last 30 days)', included: true },
  { text: 'Weak-topic reports — see what to review together', included: true },
  { text: 'Compare children side by side', included: true },
  { text: '10,000 gold coins a year to reward your kids', included: true },
  { text: `+₱${CHILD_SLOT_PRICE_PHP}/yr per extra child (up to 5 total)`, included: true },
];
