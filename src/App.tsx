import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CampusScene } from './scenes/CampusScene';
import { HotspotPanel } from './components/HotspotPanel';
import { MobileJoystick } from './components/MobileJoystick';
import { LoadingScreen } from './components/LoadingScreen';
import { useQualityTier } from './hooks/useQualityTier';
import { DEFAULT_TIME_OF_DAY, LIGHTING_PRESETS, type TimeOfDay } from './theme/campusTheme';
import { DebugTools } from './dev/DebugTools';

/**
 * Cảnh fallback hiển thị trong khi Rapier WASM đang tải:
 * Hiển thị bầu trời, sương mù và ánh sáng cơ bản để user không thấy màn hình đen.
 */
function FallbackScene() {
  return (
    <>
      <color attach="background" args={['#CFE6F7']} />
      <fog attach="fog" args={['#CFE6F7', 120, 380]} />
      <ambientLight color="#E8F1F8" intensity={0.8} />
      <hemisphereLight args={['#BFE0F7', '#8B947E', 0.7]} />
    </>
  );
}

export default function App() {
  const quality = useQualityTier();
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(DEFAULT_TIME_OF_DAY);
  const preset = LIGHTING_PRESETS[timeOfDay];

  return (
    <main className="relative h-full w-full overflow-hidden bg-slate-950">
      <LoadingScreen />

      <header className="pointer-events-auto fixed left-4 top-4 z-20 max-w-xs rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-white shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-bold text-sky-400">VMU Campus Tour 3D</h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTimeOfDay((prev) => (prev === 'day' ? 'sunset' : 'day'))}
              className="rounded bg-sky-500/25 px-2 py-0.5 text-[11px] font-medium text-sky-200 hover:bg-sky-500/40"
              title="Chuyển đổi Ban ngày / Hoàng hôn"
            >
              {timeOfDay === 'day' ? '☀️ Ban ngày' : '🌇 Hoàng hôn'}
            </button>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
              {quality.tier}
            </span>
          </div>
        </div>
        <p className="mt-1.5 hidden text-xs text-slate-300 md:block">
          Dùng <kbd className="rounded bg-slate-700 px-1.5 py-0.5">WASD</kbd> /{' '}
          <kbd className="rounded bg-slate-700 px-1.5 py-0.5">Phím mũi tên</kbd>{' '}
          để đi dạo, giữ chuột trái xoay góc nhìn, bấm vào tòa nhà để xem thông tin.
        </p>
        <p className="mt-1.5 text-xs text-slate-300 md:hidden">
          Kéo Joystick trái để đi, vuốt nửa màn hình phải để xoay góc nhìn.
        </p>
      </header>

      <MobileJoystick />
      <HotspotPanel />

      {/* Khóa ACESFilmicToneMapping, SRGBColorSpace và PCFSoftShadowMap giúp bóng đổ mềm mại */}
      <Canvas
        shadows={quality.enableShadows ? 'soft' : false}
        dpr={quality.dpr}
        camera={{ fov: 55, near: 0.25, far: 420, position: [2, 4.5, -4] }}
        gl={{
          powerPreference: 'high-performance',
          antialias: quality.tier !== 'low',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: preset.toneMappingExposure,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <Suspense fallback={<FallbackScene />}>
          <CampusScene quality={quality} timeOfDay={timeOfDay} />
          <DebugTools tier={quality.tier} />
        </Suspense>
      </Canvas>
    </main>
  );
}
