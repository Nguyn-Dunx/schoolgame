import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';

interface DomeTowerProps {
  position: [number, number, number];
  drumRadius?: number;
  drumHeight?: number;
}

/**
 * Tháp mái vòm bán cầu xanh dương trên trống hình trụ trắng (Đã tối ưu gộp Geometry):
 * - Gộp toàn bộ bệ vuông + trống trụ trắng + gờ cổ vòm + 6 gân kinh tuyến trắng vào đúng 1 BufferGeometry (`whiteGeo`).
 * - Giảm từ 12 meshes xuống chỉ còn 4 meshes.
 */
export function DomeTower({
  position,
  drumRadius = 4.2,
  drumHeight = 3.2,
}: DomeTowerProps) {
  const whiteGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];

    // 1. Bệ vuông đỡ trống trụ
    const base = new THREE.BoxGeometry(drumRadius * 2.3, 0.8, drumRadius * 2.3);
    base.translate(0, 0.4, 0);
    parts.push(base);

    // 2. Trống hình trụ trắng
    const drum = new THREE.CylinderGeometry(drumRadius, drumRadius, drumHeight, 20);
    drum.translate(0, 0.8 + drumHeight / 2, 0);
    parts.push(drum);

    // 3. Gờ chỉ trắng viền cổ vòm
    const collar = new THREE.TorusGeometry(drumRadius + 0.12, 0.16, 8, 24);
    collar.rotateX(Math.PI / 2);
    collar.translate(0, 0.8 + drumHeight, 0);
    parts.push(collar);

    // 4. Sáu gân kinh tuyến trắng nổi trên vòm xanh
    [0, 30, 60, 90, 120, 150].forEach((deg) => {
      const rib = new THREE.TorusGeometry(drumRadius + 0.03, 0.045, 6, 20, Math.PI);
      rib.rotateY(THREE.MathUtils.degToRad(deg));
      rib.translate(0, 0.8 + drumHeight, 0);
      parts.push(rib);
    });

    return mergeGeometries(parts, false);
  }, [drumRadius, drumHeight]);

  useEffect(() => {
    return () => {
      whiteGeo?.dispose();
    };
  }, [whiteGeo]);

  return (
    <group position={position} name="landmark-dome-tower">
      {/* 1. Toàn bộ phần trắng (Bệ + Trống trụ + Cổ vòm + 6 Kinh tuyến) = 1 Draw Call */}
      <mesh geometry={whiteGeo} castShadow receiveShadow>
        <meshStandardMaterial color={CAMPUS_PALETTE.ivoryWhite} roughness={0.58} />
      </mesh>

      {/* 2. Dải cửa sổ kính tối màu quanh trống trụ */}
      <mesh position={[0, 0.8 + drumHeight * 0.55, 0]}>
        <cylinderGeometry args={[drumRadius + 0.04, drumRadius + 0.04, drumHeight * 0.38, 16]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.glassDark} roughness={0.3} metalness={0.35} />
      </mesh>

      {/* 3. Mái vòm bán cầu xanh dương */}
      <mesh position={[0, 0.8 + drumHeight, 0]} castShadow>
        <sphereGeometry args={[drumRadius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={CAMPUS_PALETTE.roofMaritimeBlue}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>

      {/* 4. Kim thu sét vàng kim trên đỉnh vòm */}
      <mesh position={[0, 0.8 + drumHeight + drumRadius + 0.7, 0]}>
        <cylinderGeometry args={[0.04, 0.08, 1.4, 6]} />
        <meshStandardMaterial
          color={CAMPUS_PALETTE.goldMetallic}
          emissive={CAMPUS_PALETTE.goldDark}
          emissiveIntensity={0.18}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}
