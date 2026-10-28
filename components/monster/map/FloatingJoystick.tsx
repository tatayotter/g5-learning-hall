'use client';
// components/monster/map/FloatingJoystick.tsx
// How a press on the map moves the kid (Rowil 2026-10-28):
//  - A tap or click that stays put walks there (around walls), or walks up to the tree, plant,
//    exit or guild master under it and uses it: passed on as MAP_TAP_EVENT (lib/mapTap.ts),
//    which lib/phaserMap/TrainingMapScene.ts turns into a map tile.
//  - On a phone, pressing and dragging pops up a joystick where the finger first touched and
//    steers in any direction while held. Nothing shows until the finger actually drags, and it
//    hides again on release. The base follows a finger that drags past its rim.
//
// Listens on the map frame itself (the element this renders into), but only to presses that
// land on the map canvas, so buttons, name tags and panels over the map keep their own taps.
// Renders nothing in place: the joystick is portaled to document.body, because the frame sits
// inside a `transform: scale(...)` wrapper (useStageScale), and a `position: fixed` descendant
// of a transformed ancestor is placed relative to that ancestor instead of the viewport.
import { useEffect, useRef, useState } from 'react';
import { useHasMounted } from '@/hooks/useClientValue';
import { MAP_TAP_EVENT } from '@/lib/mapTap';
import { createPortal } from 'react-dom';

const OUTER_SIZE = 104;
const KNOB_SIZE = 44;
const MAX_RADIUS = (OUTER_SIZE - KNOB_SIZE) / 2;
// How far a finger moves before a press counts as a drag (and the joystick shows).
const DRAG_START = 10;
// A press that moved less than this is a tap.
const TAP_SLOP = 12;
// Fraction of MAX_RADIUS the knob must travel before the kid moves — a resting thumb stays put.
const DEAD_ZONE = 0.25;
// Slowest walk, as a share of full speed, for a knob just past the dead zone; full speed at
// FULL_PUSH of the rim and beyond.
const MIN_SPEED = 0.45;
const FULL_PUSH = 0.75;

interface FloatingJoystickProps {
  disabled: boolean;
  setStick: (v: { x: number; y: number } | null) => void;
}

export default function FloatingJoystick({ disabled, setStick }: FloatingJoystickProps) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const mounted = useHasMounted();
  // Latest props for the listeners, which are attached once.
  const disabledRef = useRef(disabled);
  const setStickRef = useRef(setStick);
  useEffect(() => { setStickRef.current = setStick; }, [setStick]);
  const stopRef = useRef<() => void>(() => {});
  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled) stopRef.current();
  }, [disabled]);

  useEffect(() => {
    const frame = markerRef.current?.parentElement;
    if (!frame) return;
    // Only one press at a time: a second finger (the other thumb, a palm) is ignored until
    // the first one lifts.
    let press: { id: number; touch: boolean; x: number; y: number; ax: number; ay: number; dragging: boolean; far: boolean } | null = null;

    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      if (press?.dragging) {
        setStickRef.current(null);
        setVisible(false);
        setKnobOffset({ x: 0, y: 0 });
      }
      press = null;
    };
    stopRef.current = stop;

    const onMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
      if (moved >= TAP_SLOP) press.far = true;
      if (!press.dragging) {
        if (!press.touch || moved < DRAG_START) return;
        press.dragging = true;
        setVisible(true);
      }
      let dx = e.clientX - press.ax, dy = e.clientY - press.ay;
      let dist = Math.hypot(dx, dy);
      if (dist > MAX_RADIUS) {
        // Past the rim: drag the base along so the knob stays under the finger.
        press.ax += (dx / dist) * (dist - MAX_RADIUS);
        press.ay += (dy / dist) * (dist - MAX_RADIUS);
        dx = e.clientX - press.ax; dy = e.clientY - press.ay;
        dist = MAX_RADIUS;
      }
      setAnchor({ x: press.ax, y: press.ay });
      setKnobOffset({ x: dx, y: dy });
      const push = dist / MAX_RADIUS;
      if (push < DEAD_ZONE) { setStickRef.current(null); return; }
      const speed = MIN_SPEED + (1 - MIN_SPEED) * Math.min(1, (push - DEAD_ZONE) / (FULL_PUSH - DEAD_ZONE));
      setStickRef.current({ x: (dx / dist) * speed, y: (dy / dist) * speed });
    };

    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const tap = !press.dragging && !press.far;
      stop();
      if (tap) window.dispatchEvent(new CustomEvent(MAP_TAP_EVENT, { detail: { clientX: e.clientX, clientY: e.clientY } }));
    };
    const onCancel = (e: PointerEvent) => {
      if (press && e.pointerId === press.id) stop();
    };

    const onDown = (e: PointerEvent) => {
      if (press || disabledRef.current || !e.isPrimary) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!(e.target instanceof HTMLCanvasElement)) return;
      press = {
        id: e.pointerId, touch: e.pointerType !== 'mouse',
        x: e.clientX, y: e.clientY, ax: e.clientX, ay: e.clientY, dragging: false, far: false,
      };
      setAnchor({ x: e.clientX, y: e.clientY });
      setKnobOffset({ x: 0, y: 0 });
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };

    // A drag on the map must steer, not scroll or zoom the page.
    const touchAction = frame.style.touchAction;
    frame.style.touchAction = 'none';
    frame.addEventListener('pointerdown', onDown);
    return () => {
      frame.removeEventListener('pointerdown', onDown);
      frame.style.touchAction = touchAction;
      stop();
    };
  }, []);

  return (
    <>
      <span ref={markerRef} hidden />
      {/* z-[79]: just above the full-screen map stage (z-[78]), under the panels over it. */}
      {mounted && visible && createPortal(
        <div
          className="fixed z-[79] pointer-events-none"
          style={{ left: anchor.x, top: anchor.y, transform: 'translate(-50%, -50%)' }}
          data-testid="map-joystick"
        >
          <div
            className="relative rounded-full bg-[#0a0807]/45 border-2 border-[#ffffff]/30 shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
            style={{ width: OUTER_SIZE, height: OUTER_SIZE }}
          >
            <div
              className="absolute rounded-full bg-[#ffffff]/85 border-2 border-[#d4a017] shadow"
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
