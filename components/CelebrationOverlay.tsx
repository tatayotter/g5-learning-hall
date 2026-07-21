'use client';
import { useEffect, useRef, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  type: 'ember' | 'star';
}

interface CelebrationOverlayProps {
  userId: string;
  trigger: boolean;
  type: 'levelup' | 'perfect' | 'curio';
  onComplete?: () => void;
}

const EMBER_COLORS = ['#ff6a00', '#ff8c00', '#ffa500', '#ffcc00', '#ff4500', '#ff2200'];
const STAR_COLORS  = ['#f9a8d4', '#ec4899', '#f472b6', '#fde68a', '#c4b5fd', '#ffffff'];

function createParticle(id: number, type: 'ember' | 'star', count: number): Particle {
  const angle = (Math.PI * 2 * id) / count + (Math.random() - 0.5) * 0.8;
  const speed = type === 'ember'
    ? 3 + Math.random() * 6
    : 2 + Math.random() * 5;

  const colors = type === 'ember' ? EMBER_COLORS : STAR_COLORS;

  return {
    id,
    x: 50 + (Math.random() - 0.5) * 10, // % of screen width
    y: 50 + (Math.random() - 0.5) * 10, // % of screen height
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - (type === 'ember' ? 2 : 1),
    size: type === 'ember'
      ? 4 + Math.random() * 8
      : 8 + Math.random() * 16,
    opacity: 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 8,
    life: 0,
    maxLife: type === 'ember'
      ? 40 + Math.random() * 40
      : 50 + Math.random() * 50,
    type,
  };
}

function drawEmber(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.translate(
    (p.x / 100) * ctx.canvas.width,
    (p.y / 100) * ctx.canvas.height
  );
  ctx.rotate((p.rotation * Math.PI) / 180);

  // Glowing ember — oval with blur
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, p.color);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trailing glow
  ctx.shadowColor = p.color;
  ctx.shadowBlur = p.size * 2;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.translate(
    (p.x / 100) * ctx.canvas.width,
    (p.y / 100) * ctx.canvas.height
  );
  ctx.rotate((p.rotation * Math.PI) / 180);

  const spikes = 5;
  const outerR = p.size;
  const innerR = p.size * 0.4;

  // Glow
  ctx.shadowColor = p.color;
  ctx.shadowBlur = p.size * 1.5;

  ctx.fillStyle = p.color;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fill();

  // White center sparkle
  ctx.globalAlpha = p.opacity * 0.8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, p.size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export default function CelebrationOverlay({ userId, trigger, type, onComplete }: CelebrationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const [active, setActive] = useState(false);

  const isTala    = userId === 'tala';
  const particle_type: 'ember' | 'star' = isTala ? 'star' : 'ember';

  const COUNT = type === 'perfect' ? 40 : 80;

  useEffect(() => {
    if (!trigger) return;
    setActive(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = Array.from({ length: COUNT }, (_, i) =>
      createParticle(i, particle_type, COUNT)
    );

    // For level-up and curio reveals: add a second burst slightly offset
    if (type === 'levelup' || type === 'curio') {
      const burst2 = Array.from({ length: COUNT / 2 }, (_, i) => {
        const p = createParticle(i + COUNT, particle_type, COUNT / 2);
        p.x = 30 + Math.random() * 40;
        p.y = 30 + Math.random() * 40;
        p.life = -15; // staggered start
        return p;
      });
      particles = [...particles, ...burst2];
    }

    function tick() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allDead = true;

      particles.forEach(p => {
        p.life++;
        if (p.life < 0) return; // stagger

        const progress = p.life / p.maxLife;
        p.x  += p.vx * 0.4;
        p.y  += p.vy * 0.4;
        p.vy += particle_type === 'ember' ? -0.08 : 0.05; // embers rise, stars fall
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, 1 - progress * progress);

        if (particle_type === 'ember') {
          p.size = Math.max(0, p.size * (1 - progress * 0.01));
        }

        if (p.opacity > 0) {
          allDead = false;
          if (particle_type === 'ember') drawEmber(ctx, p);
          else drawStar(ctx, p);
        }
      });

      if (allDead) {
        setActive(false);
        onComplete?.();
        return;
      }

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animRef.current);
  }, [trigger]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
