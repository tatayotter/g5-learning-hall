'use client';
// components/monster/map/Joystick.tsx
// Touch-drag virtual joystick for the training map — replaces the old
// tap-and-hold 4-button dpad on mobile. Desktop players already have full
// arrow-key support via useContinuousMovement's own keydown/keyup listeners
// (see TrainingMap.tsx), so this is rendered `md:hidden` there and a
// physical dpad is no longer shown at all on desktop.
//
// Drives the exact same setDirectionPressed(dir, pressed) API the old dpad
// buttons used, so useContinuousMovement needed zero changes — diagonal
// movement (two directions held at once) already worked for the dpad and
// keyboard, and works here too via the 8-way angle sectors below.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Direction } from '@/hooks/useContinuousMovement';

const OUTER_SIZE = 84;
const KNOB_SIZE = 36;
const MAX_RADIUS = (OUTER_SIZE - KNOB_SIZE) / 2;
// Fraction of MAX_RADIUS the knob must travel before any direction
// registers — avoids phantom drift from a stationary thumb.
const DEAD_ZONE = 0.3;

const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

interface JoystickProps {
  disabled: boolean;
  setDirectionPressed: (dir: Direction, pressed: boolean) => void;
}

export default function Joystick({ disabled, setDirectionPressed }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<Set<Direction>>(new Set());
  const draggingRef = useRef(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const clearAll = useCallback(() => {
    activeRef.current.forEach(dir => setDirectionPressed(dir, false));
    activeRef.current.clear();
    setKnobOffset({ x: 0, y: 0 });
  }, [setDirectionPressed]);

  // Maps the drag vector to up to two simultaneously-held directions (8-way
  // sectors, 45° each, centered on the 4 cardinal + 4 diagonal directions)
  // so a diagonal drag drives diagonal movement the same way holding two
  // arrow keys does.
  const applyDirections = useCallback((dx: number, dy: number, magnitude: number) => {
    const next = new Set<Direction>();
    if (magnitude >= MAX_RADIUS * DEAD_ZONE) {
      const deg = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180, 0 = right, +Y down
      if (deg > -22.5 && deg <= 22.5) next.add('right');
      else if (deg > 22.5 && deg <= 67.5) { next.add('right'); next.add('down'); }
      else if (deg > 67.5 && deg <= 112.5) next.add('down');
      else if (deg > 112.5 && deg <= 157.5) { next.add('left'); next.add('down'); }
      else if (deg > 157.5 || deg <= -157.5) next.add('left');
      else if (deg > -157.5 && deg <= -112.5) { next.add('left'); next.add('up'); }
      else if (deg > -112.5 && deg <= -67.5) next.add('up');
      else { next.add('right'); next.add('up'); }
    }
    ALL_DIRECTIONS.forEach(dir => {
      const was = activeRef.current.has(dir);
      const is = next.has(dir);
      if (was !== is) setDirectionPressed(dir, is);
    });
    activeRef.current = next;
  }, [setDirectionPressed]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, MAX_RADIUS);
    if (dist > 0) {
      dx = (dx / dist) * clamped;
      dy = (dy / dist) * clamped;
    }
    setKnobOffset({ x: dx, y: dy });
    applyDirections(dx, dy, clamped);
  }, [applyDirections]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    clearAll();
  }, [handlePointerMove, clearAll]);

  // Cancel an in-progress drag if the joystick gets disabled mid-hold (e.g.
  // a scroll/quiz overlay opens) — mirrors the old dpad's disabled guard.
  useEffect(() => {
    if (disabled && draggingRef.current) handlePointerUp();
  }, [disabled, handlePointerUp]);

  // Safety net if the component unmounts mid-drag (region change etc.).
  useEffect(() => () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    draggingRef.current = true;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    handlePointerMove(e.nativeEvent);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      className={`relative rounded-full bg-[#0a0807]/40 border border-[#ffffff]/20 ${disabled ? 'opacity-40' : ''}`}
      style={{ width: OUTER_SIZE, height: OUTER_SIZE, touchAction: 'none' }}
    >
      <div
        className="absolute rounded-full bg-[#ffffff]/80 shadow pointer-events-none"
        style={{
          width: KNOB_SIZE, height: KNOB_SIZE,
          left: '50%', top: '50%',
          transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
          transition: draggingRef.current ? 'none' : 'transform 0.15s ease-out',
        }}
      />
    </div>
  );
}
