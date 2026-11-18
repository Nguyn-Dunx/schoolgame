import { useRef, useState } from 'react';
import { useTourStore } from '../store/useTourStore';

const MAX_RADIUS = 44;

export function MobileJoystick() {
  const setJoystick = useTourStore((s) => s.setJoystick);
  const addCameraDelta = useTourStore((s) => s.addCameraDelta);

  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const joystickPointerId = useRef<number | null>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });

  const lookPointerId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  return (
    <div className="pointer-events-none fixed inset-0 z-20 md:hidden">
      <div
        className="pointer-events-auto absolute right-0 top-0 h-full w-1/2"
        onPointerDown={(e) => {
          if (lookPointerId.current !== null) return;
          lookPointerId.current = e.pointerId;
          lastLookPos.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== lookPointerId.current) return;
          const dx = e.clientX - lastLookPos.current.x;
          const dy = e.clientY - lastLookPos.current.y;
          lastLookPos.current = { x: e.clientX, y: e.clientY };
          addCameraDelta(dx, dy);
        }}
        onPointerUp={(e) => {
          if (e.pointerId === lookPointerId.current) {
            lookPointerId.current = null;
          }
        }}
        onPointerCancel={(e) => {
          if (e.pointerId === lookPointerId.current) {
            lookPointerId.current = null;
          }
        }}
      />

      <div
        className="pointer-events-auto absolute bottom-8 left-8 flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/30 bg-slate-900/50 backdrop-blur-sm"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          joystickPointerId.current = e.pointerId;
          const rect = e.currentTarget.getBoundingClientRect();
          joystickCenter.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== joystickPointerId.current) return;
          const dx = e.clientX - joystickCenter.current.x;
          const dy = e.clientY - joystickCenter.current.y;
          const dist = Math.hypot(dx, dy);
          const clampedDist = Math.min(dist, MAX_RADIUS);
          const angle = Math.atan2(dy, dx);

          const offsetX = Math.cos(angle) * clampedDist;
          const offsetY = Math.sin(angle) * clampedDist;

          setKnobOffset({ x: offsetX, y: offsetY });
          setJoystick(offsetX / MAX_RADIUS, -offsetY / MAX_RADIUS);
        }}
        onPointerUp={(e) => {
          if (e.pointerId !== joystickPointerId.current) return;
          joystickPointerId.current = null;
          setKnobOffset({ x: 0, y: 0 });
          setJoystick(0, 0);
        }}
        onPointerCancel={(e) => {
          if (e.pointerId !== joystickPointerId.current) return;
          joystickPointerId.current = null;
          setKnobOffset({ x: 0, y: 0 });
          setJoystick(0, 0);
        }}
      >
        <div
          className="h-12 w-12 rounded-full bg-amber-400/90 shadow-lg"
          style={{
            transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
          }}
        />
      </div>
    </div>
  );
}
