import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import {
  DEFAULT_TIME_OF_DAY,
  LIGHTING_PRESETS,
  type TimeOfDay,
} from '../theme/campusTheme';
import type { QualityConfig } from '../hooks/useQualityTier';

interface LightingAndSkyProps {
  quality: QualityConfig;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  timeOfDay?: TimeOfDay;
}

/**
 * Hệ thống Ánh sáng & Bầu trời hỗ trợ 'day' (mặc định: trời xanh trong, nắng cao 40°, bóng mềm không đen đặc)
 * và 'sunset' (tùy chọn hoàng hôn).
 * Có cơ chế Texel-Snapping cho đèn mặt trời bám theo người chơi để chống rung/nhấp nháy mép bóng đổ.
 */
export function LightingAndSky({
  quality,
  playerPosRef,
  timeOfDay = DEFAULT_TIME_OF_DAY,
}: LightingAndSkyProps) {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const { scene, gl } = useThree();
  const preset = LIGHTING_PRESETS[timeOfDay];

  useEffect(() => {
    gl.toneMappingExposure = preset.toneMappingExposure;
  }, [gl, preset.toneMappingExposure]);

  useEffect(() => {
    if (dirLightRef.current) {
      scene.add(dirLightRef.current.target);
    }
    return () => {
      if (dirLightRef.current) {
        scene.remove(dirLightRef.current.target);
      }
    };
  }, [scene]);

  useFrame(() => {
    const light = dirLightRef.current;
    if (!light) return;

    // Snap tọa độ X, Z của người chơi theo kích thước 1 texel của Shadow Map để bóng đổ tĩnh không bị nhấp nháy
    const worldSpan = preset.shadowCameraHalfExtent * 2;
    const texelSize = worldSpan / Math.max(512, quality.shadowMapSize);

    const snappedX = Math.round(playerPosRef.current.x / texelSize) * texelSize;
    const snappedZ = Math.round(playerPosRef.current.z / texelSize) * texelSize;
    const [ox, oy, oz] = preset.sunOffsetFromPlayer;

    light.position.set(snappedX + ox, oy, snappedZ + oz);
    light.target.position.set(snappedX, 0, snappedZ);
    light.target.updateMatrixWorld();
  });

  const halfExtent = preset.shadowCameraHalfExtent;

  return (
    <>
      {/* Nền màu bầu trời chân trời để phần xa không bao giờ bị đen hoặc trắng lóa */}
      <color attach="background" args={[preset.fogColor]} />

      {/* Sương mù màu xanh nhạt khớp đường chân trời (ở chế độ 'day') */}
      <fog attach="fog" args={[preset.fogColor, preset.fogNear, preset.fogFar]} />

      <Sky
        distance={4500}
        sunPosition={preset.sunOffsetFromPlayer}
        turbidity={preset.skyTurbidity}
        rayleigh={preset.skyRayleigh}
        mieCoefficient={preset.skyMieCoefficient}
        mieDirectionalG={preset.skyMieDirectionalG}
      />

      {/* Ánh sáng môi trường & bán cầu đủ mạnh để vùng khuất bóng luôn >= 35-40% độ sáng */}
      <ambientLight color={preset.ambientColor} intensity={preset.ambientIntensity} />
      <hemisphereLight
        args={[preset.hemiSkyColor, preset.hemiGroundColor, preset.hemiIntensity]}
      />

      {/* Đèn mặt trời chính với shadow-normalBias = 0.02 và shadow-radius làm mềm bóng */}
      <directionalLight
        ref={dirLightRef}
        castShadow={quality.enableShadows}
        color={preset.sunColor}
        intensity={preset.sunIntensity}
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
        shadow-camera-left={-halfExtent}
        shadow-camera-right={halfExtent}
        shadow-camera-top={halfExtent}
        shadow-camera-bottom={-halfExtent}
        shadow-camera-near={8}
        shadow-camera-far={190}
        shadow-bias={preset.shadowBias}
        shadow-normalBias={preset.shadowNormalBias}
        shadow-radius={preset.shadowRadius}
      />
    </>
  );
}
