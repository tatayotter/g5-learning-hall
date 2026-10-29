// components/monster/map/flyToBag.ts
// The "it went into your bag" moment for anything earned on the Training Map (veggies,
// seed packets, trash; use it for every new map item too): its icon pops up over the
// player, hangs there for a beat, then flies in an arc into the bag button
// (MapItemBar's data-testid="item-bag"), which gives a little bump when it lands.
// Several icons follow one another. Plain DOM + Web Animations, drawn on top of
// everything, so it works whatever panel was just closed.
const POP_MS = 420;
const HOLD_MS = 180;
const FLY_MS = 620;
const STAGGER_MS = 260;
const SIZE = 44;

const center = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

// smooth: the icon is painted art (trash), not pixel art (veggies), so don't pixelate it.
export function flyToBag(icons: string[], { smooth = false }: { smooth?: boolean } = {}) {
  if (typeof document === 'undefined' || icons.length === 0) return;
  const bag = document.querySelector('[data-testid="item-bag"]');
  const self = document.querySelector('[data-testid="map-self-marker"]');
  if (!bag) return;
  const bump = () => bag.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(0.95)' }, { transform: 'scale(1)' }],
    { duration: 320, easing: 'ease-out' },
  );
  if (!self || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { bump(); return; }

  const from = center(self);
  const to = center(bag);
  icons.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.dataset.testid = 'fly-to-bag';
    Object.assign(img.style, {
      position: 'fixed', left: `${from.x - SIZE / 2}px`, top: `${from.y - SIZE / 2}px`,
      width: `${SIZE}px`, height: `${SIZE}px`, zIndex: '120', pointerEvents: 'none',
      imageRendering: smooth ? 'auto' : 'pixelated', objectFit: 'contain', filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.45))', opacity: '0',
    });
    document.body.appendChild(img);
    const dx = to.x - from.x, dy = to.y - from.y;
    // Pop: rise out of the plant with a bounce, then sit still for a beat.
    const pop = img.animate([
      { transform: 'translate(0, 10px) scale(0.2)', opacity: 0 },
      { transform: 'translate(0, -46px) scale(1.25)', opacity: 1, offset: 0.6 },
      { transform: 'translate(0, -38px) scale(1)', opacity: 1 },
    ], { duration: POP_MS, delay: i * STAGGER_MS, easing: 'cubic-bezier(.2,.8,.3,1.2)', fill: 'forwards' });
    pop.onfinish = () => {
      // Fly: an arc (up first, then down into the bag), shrinking as it goes.
      const lift = Math.min(-60, dy / 2 - 80);
      const fly = img.animate([
        { transform: 'translate(0, -38px) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.45}px, ${lift}px) scale(0.9)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.45)`, opacity: 0.9 },
      ], { duration: FLY_MS, delay: HOLD_MS, easing: 'cubic-bezier(.45,0,.7,1)', fill: 'forwards' });
      fly.onfinish = () => { img.remove(); bump(); };
    };
  });
}

/** The same moment for gold (Rowil 2026-10-29): coins pop up over the player and fly in an arc
 *  into the HUD's gold counter (SidebarRail's data-testid="hud-gold"), which bumps as each lands.
 *  More gold, more coins (3 to 8). */
export function flyGold(amount: number) {
  if (typeof document === 'undefined' || amount <= 0) return;
  const chip = document.querySelector('[data-testid="hud-gold"]');
  const self = document.querySelector('[data-testid="map-self-marker"]');
  if (!chip) return;
  const bump = () => chip.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(0.95)' }, { transform: 'scale(1)' }],
    { duration: 280, easing: 'ease-out' },
  );
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { bump(); return; }
  const from = self ? center(self) : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const to = center(chip);
  const coins = Math.min(8, Math.max(3, Math.ceil(amount / 5)));
  for (let i = 0; i < coins; i++) {
    const img = document.createElement('img');
    img.src = '/icons/rewards/gold_coin.svg';
    img.alt = '';
    img.dataset.testid = 'fly-gold';
    const size = 26;
    Object.assign(img.style, {
      position: 'fixed', left: `${from.x - size / 2}px`, top: `${from.y - size / 2}px`,
      width: `${size}px`, height: `${size}px`, zIndex: '120', pointerEvents: 'none',
      filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.45))', opacity: '0',
    });
    document.body.appendChild(img);
    // Each coin bursts out to its own spot, then they stream into the counter one by one.
    const spread = (i - (coins - 1) / 2) * 16;
    const burstY = -40 - (i % 2) * 14;
    const dx = to.x - from.x, dy = to.y - from.y;
    const pop = img.animate([
      { transform: 'translate(0, 8px) scale(0.3)', opacity: 0 },
      { transform: `translate(${spread}px, ${burstY}px) scale(1.15)`, opacity: 1, offset: 0.65 },
      { transform: `translate(${spread}px, ${burstY + 6}px) scale(1)`, opacity: 1 },
    ], { duration: 360, delay: i * 40, easing: 'cubic-bezier(.2,.8,.3,1.2)', fill: 'forwards' });
    pop.onfinish = () => {
      const fly = img.animate([
        { transform: `translate(${spread}px, ${burstY + 6}px) scale(1)`, opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.55)`, opacity: 0.9 },
      ], { duration: 520, delay: 120 + i * 70, easing: 'cubic-bezier(.5,0,.75,1)', fill: 'forwards' });
      fly.onfinish = () => { img.remove(); bump(); };
    };
  }
}
