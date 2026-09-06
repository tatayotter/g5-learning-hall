# Student Enrichment Content (SEC) Shop — Design

Status: **Design only. Nothing implemented.**
Owner: Rowil
Last updated: 2026-09-05

## Background

The app already has one paid product: the ₱249/yr Premium subscription
(`app/parent-dashboard/pricing/page.tsx`, `subscriptions` table, PayMongo
checkout via `app/api/create-checkout/route.ts` +
`app/api/paymongo-webhook/route.ts`). Separately, `content/mtap-expansion-
overview.md` and its per-grade docs (`content/mtap-grade{2-6}-expansion-
bow.md`) already spec a **paid, self-paced, mastery-gated math enrichment
pack** — designed but not yet built, with its DB table drafted
(`supabase/migrations/20260828130000_add_mtap_expansion_content_schema.sql`,
not yet applied) and purchase/entitlement explicitly deferred at the time.

This doc is that deferred piece: a **Shop** in the parent dashboard where a
parent buys **Student Enrichment Content (SEC)** — one-time, per-child
content packs, starting with Grade 2 Math Enrichment (MTAP-level) — plus
where and how a purchased pack shows up for the child.

A market/pricing research pass (`docs/research/enrichment-dlc-research.xlsx`)
already scoped 6 candidate SEC categories × grades 2-6, priced each, and
flagged evidence strength per category. This doc only builds the plumbing
and the first SKU (Grade 2 Math Enrichment, ₱99); the rest of that catalog
is future content, not future engineering — the Shop and entitlement model
below are meant to hold all of it without redesign.

## Decisions (confirmed with Rowil)

- **SEC is sold to parents, not kids.** The Shop lives in the parent
  dashboard, same audience as the existing Pricing page.
- **Entitlement is per child, not per account.** A parent picks which child
  a pack applies to at purchase time — consistent with a purchased pack
  becoming a quest line inside *that child's* own progression, not a
  household-wide unlock.
- **Delivered as a quest line, with real gold/XP rewards — this is a
  selling point.** SEC content isn't a static worksheet; it's playable
  quests that pay into the same economy as everything else the child does.
- **Same reward rate as regular guild content, not boosted.** SEC questions
  call the existing `calculateReward()` (`lib/quizReward.ts` — 200 XP / 50
  gold base, decayed by retry attempts) unchanged. The pitch to parents is
  "more quests to play, more total gold/XP over time," not a richer
  per-question payout — this avoids re-tuning an economy that already
  works and avoids devaluing free content by comparison.
- **Independent of Premium.** Any parent can buy a SEC pack — Free-tier or
  Premium — it is not an upsell gated behind the subscription. Cheaper
  entry point than the ₱249/yr subscription, and matches the DLC research's
  framing of these as separate, additive purchases.
- **New page, not folded into Pricing.** `/parent-dashboard/shop` is a
  one-time-purchase catalog, kept apart from `/parent-dashboard/pricing`
  (recurring subscription) so the two different billing relationships don't
  get presented as one decision.
- **v1 catalog = one real SKU.** Grade 2 Math Enrichment (MTAP-level), ₱99,
  matching `docs/research/enrichment-dlc-research.xlsx`. No "coming soon"
  placeholder tiles for the other 29 grade×category rows in that research
  yet — ship one working purchase end-to-end before building catalog UI for
  content that doesn't exist.
- **One SEC pack per grade per category — not per strand, not per
  archetype.** "Grade 2 Math Enrichment" is a single `sec_packs` row
  covering *all* of Grade 2's MTAP content (all 8 strands, every
  archetype, all 3 tiers, per `mtap-grade2-expansion-bow.md`) — a parent
  buys the whole grade's math pack in one purchase, not individual strands.
  The eventual MTAP category is therefore exactly **5 packs total**
  (Grades 2-6), one per row already priced in the DLC research sheet — the
  same "own strands, not reused" per-grade boundary the content docs
  already use, just applied as the purchase boundary too. This is why
  `content_ref` above is scoped as a grade-level filter (`grade = 2`) into
  `mtap_expansion_content`, not a strand- or archetype-level one.
- **Kid-side tab name: "Bonus Quests."** Sibling to `GuildsTab` /
  `JournalTab` / `VaultTab` in the child dashboard, not folded into an
  existing guild and not a node on the calendar-gated weekly Board map
  (SEC is explicitly self-paced, unlike the Board).

## Why today's payment plumbing can't just be reused as-is

`app/api/create-checkout/route.ts` and `app/api/paymongo-webhook/route.ts`
are hardcoded to one product: `BASE_PRICE_PHP` / `ADDON_PRICE_PHP` line
items, a single `create_checkout_session` RPC that always writes into
`subscriptions`, and a single `handle_paymongo_webhook` RPC that always
activates a subscription row. There is currently no concept of "which
product is this checkout for" anywhere in that path.

SEC needs its own product identity carried through the whole round trip
(checkout creation → PayMongo → webhook → entitlement write) without
touching the subscription path's existing behavior. The design below adds
a `type` discriminator at checkout-creation time and branches on it in the
webhook, rather than generalizing the existing subscription RPCs into a
shared "any product" shape — smaller diff, and zero risk of a schema change
to `subscriptions` accidentally affecting SEC or vice versa.

## Data model

### `sec_packs` (new table, catalog)

| column | type | notes |
|---|---|---|
| `id` | `text` primary key | slug, e.g. `'g2-math-enrichment'` |
| `grade` | `integer` | `CHECK (grade BETWEEN 2 AND 6)` |
| `category` | `text` | e.g. `'math_enrichment'` — mirrors the categories in the DLC research sheet |
| `title` | `text` | display name, e.g. "Grade 2 Math Enrichment (MTAP-level)" |
| `description` | `text` | shown on the Shop card |
| `price_php` | `integer` | one-time price, e.g. `99` |
| `content_ref` | `text` | how this pack's questions are actually selected — for the v1 SKU, a fixed filter into `mtap_expansion_content` (`grade = 2`); kept as a generic string/JSON now rather than a hardcoded join, since later SEC categories (reading, spelling, etc.) won't all be backed by the same content table |
| `active` | `boolean` default `true` | unpublishing without deleting purchase history |
| `created_at` | `timestamptz` | |

RLS: public `SELECT` where `active = true` (a catalog isn't sensitive — same
posture as `mtap_expansion_content_public`). No client `INSERT`/`UPDATE`;
authored via a future admin tool (see Open Items), same `admin_*` +
passcode pattern the rest of the admin surface already uses.

### `sec_entitlements` (new table, one row per child-pack purchase)

| column | type | notes |
|---|---|---|
| `id` | `uuid` primary key | |
| `parent_id` | `uuid` | the buyer, references `auth.users` like `subscriptions.parent_id` does |
| `child_id` | `text` | which child this unlocks for — matches whatever child-identity type `subscriptions`/`user_monsters` already use for `UserId` |
| `pack_id` | `text` references `sec_packs(id)` | |
| `paymongo_checkout_id` | `text` unique | idempotency key, same role it plays in `subscriptions` |
| `status` | `text` | `'pending' \| 'active'` — mirrors the subscription flow's own pending-until-webhook pattern |
| `amount_php` | `integer` | snapshot at purchase time, so a later `sec_packs.price_php` edit doesn't rewrite purchase history |
| `purchased_at` | `timestamptz` | set on activation, not on checkout creation |
| `created_at` | `timestamptz` | |
| `CONSTRAINT` | | `UNIQUE (child_id, pack_id)` — a child can't own the same pack twice; the Shop should show "Owned" instead of "Buy" once this exists |

RLS: the parent can `SELECT` their own children's rows (same ownership
check pattern already used for `subscriptions`/child profile data). No
client `INSERT`/`UPDATE` — both go through the RPCs below.

### Content source

The v1 SKU's actual questions come from `mtap_expansion_content` /
`mtap_expansion_content_public` — the table already drafted in
`20260828130000_add_mtap_expansion_content_schema.sql`. That migration has
**not been applied yet** and needs a real batch of reviewed Grade 2 rows
before this feature can show real content — see Open Items.

### Mastery/progress tracking (new, not in the existing migration)

The drafted `mtap_expansion_content` migration is content-storage only —
it deliberately deferred progress tracking (see that migration's own
header comment). This feature needs a `sec_progress` table (or equivalent)
per child × archetype × tier, tracking attempts/correctness so the
mastery-threshold rules in `mtap-expansion-overview.md` (8/10 correct
across ≥2 sessions to unlock the next tier) can actually gate Bonus Quests
the way the content docs already specify. Exact shape TBD during
implementation — flagged here so it isn't missed, not designed in full
yet, since it depends on decisions the Bonus Quests UI still needs to make
(see Open Items).

## Purchase flow

1. Parent opens `/parent-dashboard/shop`, sees the Grade 2 Math Enrichment
   card (₱99), picks which child it's for from a dropdown (their existing
   children, same source `pricing/page.tsx` would use).
2. `POST /api/create-sec-checkout` (new route, sibling to
   `create-checkout`) — auth same way (`Authorization: Bearer <token>`),
   validates `pack_id` exists and is `active`, validates `child_id` belongs
   to the caller.
3. Creates a PayMongo checkout session exactly like `create-checkout`
   does, but with `metadata: { type: 'sec_purchase', parent_id, child_id,
   pack_id }` (vs. today's `{ parent_id, addon_children }`) and
   `success_url`/`cancel_url` pointed at `/parent-dashboard/shop?...`
   instead of `/parent-dashboard`.
4. New RPC **`create_sec_checkout_session(p_parent_id, p_child_id,
   p_pack_id, p_amount_php, p_checkout_id)`** inserts the `sec_entitlements`
   row as `status = 'pending'` — mirrors `create_checkout_session`'s role
   for subscriptions.
5. `app/api/paymongo-webhook/route.ts` gains a branch: read
   `event.data.attributes.data.attributes.metadata.type` (or wherever
   PayMongo echoes back the checkout session's metadata on the payment
   event — **verify the exact path during implementation**, since today's
   webhook reads subscription fields off the `subscriptions` row it looks
   up by `checkout_id`, not off event metadata directly). If `type ===
   'sec_purchase'`, call **`handle_sec_purchase_webhook(p_checkout_id,
   p_payment_id)`** instead of `handle_paymongo_webhook` — flips the
   matching `sec_entitlements` row to `status = 'active'`,
   `purchased_at = now()`, idempotent the same way the existing RPC is
   (a retried webhook delivery must not double-activate or error).
6. Success redirect lands back on the Shop; the pack now shows "Owned" and
   is playable from that child's Bonus Quests tab.

No changes to the existing subscription checkout/webhook paths — the new
branch is additive.

## Player-facing UI

### Parent side — `/parent-dashboard/shop`

New page, same auth/loading pattern as `pricing/page.tsx` (redirect to
`/parent-login` if no session). Grid of pack cards (v1: one card) —
title, grade, short description, price, a child picker, and a Buy/Owned
button per the entitlement check above.

### Kid side — "Bonus Quests" tab

New `components/dashboard/BonusQuestsTab.tsx`, added to whatever tab list
`Dashboard.tsx` already switches on alongside `GuildsTab`/`JournalTab`/
`VaultTab`. Follows `GuildsTab.tsx`'s own two-level shape:

- **List view:** a tile per *owned* pack for the active child (empty state
  if none owned yet — plain explainer copy, no purchase flow here since
  buying happens on the parent side, not in the child's own session).
- **Detail view:** clicking a tile enters that pack's quest-line player —
  a new component (name TBD, e.g. `SecQuestPlayer.tsx`) that pulls rows
  from `mtap_expansion_content_public` filtered by the pack's
  `content_ref`, renders them through the same question-rendering pattern
  `QuestModule.tsx` already uses (per `mtap-expansion-overview.md`'s own
  note that visual/markdown-table rendering should reuse, not duplicate,
  that pipeline), and calls `calculateReward()` on completion exactly like
  a guild quest does.
- Strand/tier/mastery-gate UI (Easy → Average → Difficult, locked until
  the previous tier's threshold is met) still needs its own design pass
  once `sec_progress` (above) is shaped — flagged, not designed here.

## Open items before implementation

1. **Apply the `mtap_expansion_content` migration** and get a real,
   reviewed batch of Grade 2 rows into it (the content-only pilot discussed
   separately — Age Problems, all 3 tiers — is the first slice of that).
   Nothing in this Shop is player-visible without real content behind it.
2. **`sec_progress` schema** — per child × archetype × tier attempt
   tracking, needed to actually enforce the mastery thresholds
   `mtap-expansion-overview.md` already specifies. Not designed above,
   flagged as a dependency of the Bonus Quests detail view.
3. **Exact PayMongo metadata path on the payment-event webhook payload** —
   confirm during implementation whether `type`/`pack_id`/`child_id` are
   readable directly off the webhook event, or need to be looked up via
   the `sec_entitlements` row keyed by `checkout_id` (the pattern
   `fireParentSubscribedCapiEvent` already uses for subscriptions, which
   looks up by `checkout_id` rather than trusting event metadata).
4. **Meta CAPI conversion event for SEC purchases** — `paymongo-webhook`
   already fires a `Parent_Subscribed` event on subscription activation
   (`fireParentSubscribedCapiEvent`). Decide whether a SEC purchase should
   fire its own named event (e.g. `Parent_Purchased_SEC`) for the same
   CAC/LTV tracking reasons — not decided yet, likely yes for consistency,
   but flagged rather than assumed.
5. **Admin authoring tool for `sec_packs`.** v1's single row can be
   inserted by hand/migration; a real admin CRUD section (mirroring
   `EggChainsSection.tsx`'s pattern) is needed once the catalog grows
   beyond one SKU.
6. **Refund / access-revocation policy — DECIDED and shipped (2026-09-06).**
   Refundable within 7 days of purchase, only if the child hasn't answered
   any question in the pack yet. Published at `/terms` (new page — this app
   previously had no Terms & Conditions at all, only a Privacy Policy).
   Backed by a real mechanism, not just a stated policy: `sec_entitlements`
   gained a `'refunded'` status + `refunded_at`
   (`supabase/migrations/20260906100000_add_sec_entitlement_refunds.sql`),
   and an admin tool (`components/admin/SecRefundsSection.tsx`, "SEC
   Refunds" in the dashboard) looks a child up by username, shows their
   purchases with an attempt count (so eligibility is visible, not
   auto-approved), and revokes access — every existing entitlement gate
   already filters on `status = 'active'`, so a refunded row silently loses
   access everywhere with no other code changes. Refunding here never
   touches PayMongo; returning the money is still a manual step outside the
   app.
7. **Multiple owned packs per child** — the Bonus Quests tab's list view
   assumes this is fine (just more tiles), but hasn't been stress-tested
   against a design that assumes exactly one pack.
8. **Where the child picker on the Shop page gets its child list from** —
   confirm the exact source `pricing/page.tsx`'s own child-selection
   pattern (if any) or the parent-dashboard's main child-switcher uses, so
   the Shop doesn't reinvent that lookup.
