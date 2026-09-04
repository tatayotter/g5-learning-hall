'use client';
// components/monster/map/FloatingJoystick.tsx
// MOBA-style floating joystick — invisible until the player presses down,
// at which point it pops into existence centered on the finger and tracks
// the drag from there; releasing hides it again. Replaces the old
// always-visible bottom-left Joystick.tsx (2026-09-05).
//
// The press-and-drag zone is the LEFT HALF of the map frame only — the
// right half stays free for tapping map objects (other online players'
// avatars, the info-drawer toggle, etc.), same split most mobile MOBAs use
// between a movement thumb and everything else.
//
// Same 8-way angle-sector direction math as the old Joystick, driving the
// exact same setDirectionPressed(dir, pressed) API — useContinuousMovement
// needed zero changes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Direction } from '@/hooks/useContinuousMovement';

const OUTER_SIZE = 96;
const KNOB_SIZE = 40;
const MAX_RADIUS = (OUTER_SIZE - KNOB_SIZE) / 2;
// Fraction of MAX_RADIUS the knob must travel before any direction
// registers — avoids phantom drift from a stationary thumb.
const DEAD_ZONE = 0.3;

const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

interface FloatingJoystickProps {
  disabled: boolean;
  setDirectionPressed: (dir: Direction, pressed: boolean) => void;
}

export default function FloatingJoystick({ disabled, setDirectionPressed }: FloatingJoystickProps) {
  const activeRef = useRef<Set<Direction>>(new Set());
  const draggingRef = useRef(false);
  const anchorRef = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  // The joystick's visual pop-up renders via a portal straight into
  // document.body (see the render below) rather than in place — the map
  // frame sits inside a `transform: scale(...)` wrapper (useStageScale), and
  // a `position: fixed` descendant of a transformed ancestor is positioned
  // (and scaled) relative to THAT ancestor instead of the real viewport per
  // the CSS spec. Portaling out to body sidesteps that entirely, so
  // `left/top: e.clientX/clientY` always lines up with the actual finger
  // position. Needs a mount flag since document.body isn't available
  // during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
    if (!draggingRef.current) return;
    let dx = e.clientX - anchorRef.current.x;
    let dy = e.clientY - anchorRef.current.y;
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
    setVisible(false);
    clearAll();
  }, [handlePointerMove, clearAll]);

  // Cancel an in-progress drag if the joystick gets disabled mid-hold (e.g.
  // a scroll/quiz overlay opens) — mirrors the old dpad/Joystick's guard.
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
    anchorRef.current = { x: e.clientX, y: e.clientY };
    setAnchor(anchorRef.current);
    setKnobOffset({ x: 0, y: 0 });
    setVisible(true);
    draggingRef.current = true;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <>
      {/* Invisible capture zone — left half of the map frame. Sized to its
          parent (the frame's own relative/w-full/h-full wrapper), so it
          scales and repositions with the frame automatically. */}
      <div
        onPointerDown={handlePointerDown}
        className="absolute inset-y-0 left-0 w-1/2 z-10"
        style={{ touchAction: 'none' }}
        aria-hidden="true"
      />

      {mounted && visible && createPortal(
        <div
          className="fixed z-[70] pointer-events-none"
          style={{ left: anchor.x, top: anchor.y, transform: 'translate(-50%, -50%)' }}
        >
          <div
            className="relative rounded-full bg-[#0a0807]/40 border border-[#ffffff]/20"
            style={{ width: OUTER_SIZE, height: OUTER_SIZE }}
          >
            <div
              className="absolute rounded-full bg-[#ffffff]/80 shadow"
              style={{
                width: KNOB_SIZE, height: KNOB_SIZE,
                left: '50%', top: '50%',
                transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
