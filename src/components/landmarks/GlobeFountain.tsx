import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';
import { Canvas3DText } from '../common/Canvas3DText';

interface GlobeFountainProps {
  position?: [number, number, number];
}

/**
 * Quả địa cầu vàng kim (Đã gộp toàn bộ 6 vòng kinh tuyến + 5 vòng vĩ tuyến + vành đai xích đạo vào 1 BufferGeometry duy nhất):
 * - Giảm từ 17 meshes xuống chỉ còn 5 meshes.
 */
export function GlobeFountain({ position = [0, 0, 0] }: GlobeFountainProps) {
  const globeGroupRef = useRef<THREE.Group>(null);

  const goldCageGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];

    // 6 vòng kinh tuyến vàng kim
    [0, 30, 60, 90, 120, 150].forEach((deg) => {
      const m = new THREE.TorusGeometry(2.32, 0.055, 8, 28);
      m.rotateY(THREE.MathUtils.degToRad(deg));
      parts.push(m);
    });

    // 5 vòng vĩ tuyến vàng kim
    [
      { y: 0, r: 2.35 },
      { y: 1.1, r: 2.05 },
      { y: -1.1, r: 2.05 },
      { y: 1.85, r: 1.45 },
      { y: -1.85, r: 1.45 },
    ].forEach((lat) => {
      const p = new THREE.TorusGeometry(lat.r, 0.05, 8, 28);
      p.rotateX(Math.PI / 2);
      p.translate(0, lat.y, 0);
      parts.push(p);
    });

    return mergeGeometries(parts, false);
  }, []);

  useEffect(() => {
    return () => {
      goldCageGeo?.dispose();
    };
  }, [goldCageGeo]);

  useFrame((_, delta) => {
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += delta * 0.22;
    }
  });

  return (
    <group position={position} name="landmark-globe-fountain">
      {/* 1. Bệ trụ bát giác đá trắng ngà */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.45, 1.85, 1.1, 8]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.ivoryWhite} roughness={0.55} />
      </mesh>

      {/* 2. Cổ trụ vàng kim */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.75, 0.7, 12]} />
        <meshStandardMaterial
          color={CAMPUS_PALETTE.goldMetallic}
          emissive={CAMPUS_PALETTE.goldDark}
          emissiveIntensity={0.18}
          metalness={0.4}
          roughness={0.28}
        />
      </mesh>

      {/* 3. Quả địa cầu nghiêng trục 23.5 độ */}
      <group position={[0, 3.85, 0]} rotation={[0, 0, THREE.MathUtils.degToRad(23.5)]}>
        <group ref={globeGroupRef}>
          {/* Lõi cầu xanh dương trong */}
          <mesh>
            <sphereGeometry args={[2.12, 20, 16]} />
            <meshStandardMaterial
              color={CAMPUS_PALETTE.glassCyan}
              roughness={0.22}
              metalness={0.15}
              transparent
              opacity={0.62}
            />
          </mesh>

          {/* Toàn bộ lồng kinh/vĩ tuyến vàng kim gộp làm 1 mesh */}
          <mesh geometry={goldCageGeo} castShadow>
            <meshStandardMaterial
              color={CAMPUS_PALETTE.goldMetallic}
              emissive={CAMPUS_PALETTE.goldDark}
              emissiveIntensity={0.2}
              metalness={0.38}
              roughness={0.28}
            />
          </mesh>

          {/* Vành đai chữ vàng kim bao quanh xích đạo */}
          <mesh>
            <cylinderGeometry args={[2.46, 2.46, 0.52, 24, 1, true]} />
            <meshStandardMaterial
              color={CAMPUS_PALETTE.goldMetallic}
              emissive={CAMPUS_PALETTE.goldDark}
              emissiveIntensity={0.2}
              metalness={0.38}
              roughness={0.28}
              side={THREE.DoubleSide}
            />
          </mesh>

          <Canvas3DText
            text="VMU • MARITIME"
            position={[0, 0, 2.52]}
            fontSize={0.28}
            color={CAMPUS_PALETTE.vmuBrandBlue}
            outlineColor=""
          />
          <Canvas3DText
            text="ĐẠI HỌC HÀNG HẢI"
            position={[0, 0, -2.52]}
            rotation={[0, Math.PI, 0]}
            fontSize={0.28}
            color={CAMPUS_PALETTE.vmuBrandBlue}
            outlineColor=""
          />
        </group>
      </group>
    </group>
  );
}
