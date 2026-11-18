import { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { QualityTier } from '../hooks/useQualityTier';

export interface BenchmarkShot {
  id: number;
  name: string;
  playerPos: [number, number, number];
  lookAtTarget: [number, number, number];
  cameraPos: [number, number, number];
}

/**
 * 7 điểm chụp chuẩn (Benchmark Shots) phục vụ kiểm toán hiển thị và đo hiệu năng.
 */
export const BENCHMARK_SHOTS: BenchmarkShot[] = [
  {
    id: 1,
    name: 'Shot 1: Cổng Parabol nhìn vào sân lễ',
    playerPos: [0, 1.5, -6],
    cameraPos: [0, 3.8, 4],
    lookAtTarget: [-20, 4, -55],
  },
  {
    id: 2,
    name: 'Shot 2: Sân trước nhìn Nhà Hiệu Bộ A1 & Đài Bánh Lái',
    playerPos: [-35, 1.5, -36],
    cameraPos: [-28, 4.2, -26],
    lookAtTarget: [-58, 7, -76],
  },
  {
    id: 3,
    name: 'Shot 3: Quảng trường Ngôi sao & Quả địa cầu vàng',
    playerPos: [18, 1.5, -24],
    cameraPos: [18, 6.5, -18],
    lookAtTarget: [18, 2.5, -44],
  },
  {
    id: 4,
    name: 'Shot 4: Góc Tây Bắc gần Hồ điều hòa nhìn toàn cảnh',
    playerPos: [-144, 1.5, -198],
    cameraPos: [-152, 8.0, -190],
    lookAtTarget: [-70, 6, -110],
  },
  {
    id: 5,
    name: 'Shot 5: Sân vận động & Dãy nhà phía Đông',
    playerPos: [-42, 1.5, -165],
    cameraPos: [-42, 7.5, -158],
    lookAtTarget: [-10, 4, -202],
  },
  {
    id: 6,
    name: 'Shot 6: Cận cảnh mặt đứng Nhà Hiệu Bộ A1 & Tòa Mái Vòm A2',
    playerPos: [-92, 1.5, -54],
    cameraPos: [-92, 4.0, -46],
    lookAtTarget: [-105, 8, -76],
  },
  {
    id: 7,
    name: 'Shot 7: Cận cảnh nhân vật sinh viên VMU Low-Poly',
    playerPos: [0, 1.5, -12],
    cameraPos: [1.8, 2.1, -9.2],
    lookAtTarget: [0, 1.3, -12],
  },
];

interface DebugMetrics {
  fps: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  shotId: number | null;
}

export function DebugTools({ tier }: { tier: QualityTier }) {
  const { gl } = useThree();
  const [enabled, setEnabled] = useState(false);
  const [metrics, setMetrics] = useState<DebugMetrics>({
    fps: 60,
    calls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    shotId: null,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const activeShotRef = useRef<BenchmarkShot | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isDebug = params.get('debug') === '1';
    const shotParam = Number(params.get('shot'));
    const foundShot = BENCHMARK_SHOTS.find((s) => s.id === shotParam) || null;

    setEnabled(isDebug || Boolean(foundShot));
    activeShotRef.current = foundShot;
  }, []);

  // Chạy useFrame ở priority mặc định (0) để KHÔNG ngắt vòng lặp render tự động của React Three Fiber
  useFrame((state) => {
    if (!enabled) return;

    if (activeShotRef.current) {
      const s = activeShotRef.current;
      state.camera.position.set(s.cameraPos[0], s.cameraPos[1], s.cameraPos[2]);
      state.camera.lookAt(s.lookAtTarget[0], s.lookAtTarget[1], s.lookAtTarget[2]);
    }

    frameCount.current += 1;
    const now = performance.now();
    if (now - lastTime.current >= 400) {
      const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
      frameCount.current = 0;
      lastTime.current = now;

      setMetrics({
        fps,
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        shotId: activeShotRef.current?.id ?? null,
      });
    }
  });

  if (!enabled) return null;

  return (
    <Html fullscreen style={{ pointerEvents: 'none', zIndex: 9999 }}>
      <div className="pointer-events-auto fixed bottom-4 right-4 w-80 rounded-xl border border-emerald-500/60 bg-slate-950/90 p-3.5 font-mono text-xs text-emerald-300 shadow-2xl">
        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1.5 font-bold text-white">
          <span>QA AUDIT TELEMETRY (?debug=1)</span>
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300">
            {metrics.fps} FPS
          </span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-y-1 text-[11px]">
          <span>Tier đang dùng:</span>
          <span className="text-right font-bold uppercase text-amber-300">{tier}</span>

          <span>render.calls:</span>
          <span
            className={`text-right font-bold ${
              metrics.calls > 150 ? 'text-rose-400' : 'text-emerald-300'
            }`}
          >
            {metrics.calls} (budget &lt; 150)
          </span>

          <span>render.triangles:</span>
          <span className="text-right font-bold text-sky-300">
            {metrics.triangles.toLocaleString()}
          </span>

          <span>memory.geometries:</span>
          <span className="text-right">{metrics.geometries}</span>

          <span>memory.textures:</span>
          <span className="text-right">{metrics.textures}</span>

          {metrics.shotId && (
            <>
              <span>Active Shot:</span>
              <span className="text-right text-amber-300">#{metrics.shotId}</span>
            </>
          )}
        </div>
      </div>
    </Html>
  );
}
