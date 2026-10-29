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

