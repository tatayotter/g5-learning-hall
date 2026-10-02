// Single source of truth for Premium pricing copy — read by both the public
// marketing page (app/welcome/pricing) and the signed-in parent page
// (app/parent-dashboard/pricing), so a price or feature change can't drift
// between them. Actual billing amounts are set server-side in
// /api/create-checkout (₱249/yr Premium) and /api/create-child-slot-checkout
// (₱99 one-time slot); keep these numbers in sync with them. Child limits
// mirror public.max_children_for_parent: Premium = least(5, 3 + slots);
// lapsed/free = 1 + slots. Slots are kept forever and never re-charged.

export const PREMIUM_PRICE_PHP = 249;
export const PREMIUM_REGULAR_PRICE_PHP = 599;
export const MONTHLY_PER_CHILD_ANCHOR_PHP = 99; // "₱99/month per child" comparison anchor
export const CHILD_SLOT_PRICE_PHP = 99; // one-time per slot, kept forever

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
  { text: `Extra child slots: ₱${CHILD_SLOT_PRICE_PHP} one-time each, yours to keep (up to 5 children)`, included: true },
];
