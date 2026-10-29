// components/game/flyGold.ts
// Every time gold comes in, it flies into the gold counter (Rowil 2026-10-29), the gold version of
// the map's "it went into your bag" moment (components/monster/map/flyToBag.ts). TopHud
// (components/SidebarRail.tsx) calls it whenever the kid's gold goes up, so battles, quests,
// the daily chest, the Recycler... all get it without each one calling it. Plain DOM + Web
// Animations, drawn on top of everything.
const center = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Coins pop up over the player (or the middle of the screen off the map) and fly into the HUD's
 *  gold counter (data-testid="hud-gold"), which bumps as each lands. More gold, more coins (3 to 8). */
export function flyGold(amount: number) {
  if (typeof document === 'undefined' || amount <= 0) return;
  const chip = document.querySelector('[data-testid="hud-gold"]');
  const self = document.querySelector('[data-testid="map-self-marker"]');
  if (!chip || chip.getBoundingClientRect().width === 0) return;
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
