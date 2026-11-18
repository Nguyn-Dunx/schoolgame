import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { HotspotData } from '../../types/hotspot';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';
import { GlobeFountain } from './GlobeFountain';
import { HotspotLabel } from '../HotspotLabel';
import { HotspotSensor } from '../HotspotSensor';

interface StarPlazaProps {
  position: [number, number, number];
  size: [number, number, number];
  facingDeg?: number;
  hotspot?: HotspotData;
}

function createEightPointStarGeometry(outerR: number, innerR: number, depth: number) {
  const shape = new THREE.Shape();
  const points = 8;

  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.06,
    bevelSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

/**
 * Quảng trường Ngôi sao 8 cánh (Đã sửa cao độ rãnh nước + gộp toàn bộ đài bát giác và 4 cầu dẫn vào 1 BufferGeometry):
 * - Giảm 12 meshes cầu dẫn xuống chỉ còn 1 mesh gộp.
 */
export function StarPlaza({ position, size, facingDeg = 0, hotspot }: StarPlazaProps) {
  const [width, , depth] = size;
  const shrubMeshRef = useRef<THREE.InstancedMesh>(null);

  // Hồ sao 8 cánh chứa nước bên ngoài và mặt sàn ngôi sao trắng ngà nổi cao hơn mặt nước ở giữa
  const waterBasinStarGeo = useMemo(() => createEightPointStarGeometry(13.2, 5.8, 0.22), []);
  const innerWalkwayStarGeo = useMemo(() => createEightPointStarGeometry(10.6, 4.6, 0.28), []);

  // Gộp đài bát giác trung tâm + 4 nhịp cầu dẫn + 8 lan can cầu thành 1 BufferGeometry trắng ngà duy nhất
  // Lưu ý: Các geometry đều là Box và Cylinder (indexed), không trộn ExtrudeGeometry (non-indexed) để tránh lỗi mergeGeometries
  const mergedBridgesAndPodiumGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];

    const podium = new THREE.CylinderGeometry(4.4, 4.8, 0.55, 8);
    podium.translate(0, 0.48, 0);
    parts.push(podium);

    [0, 90, 180, 270].forEach((deg) => {
      const rad = THREE.MathUtils.degToRad(deg);

      const deck = new THREE.BoxGeometry(3.8, 0.3, 1.6);
      deck.translate(5.8, 0.44, 0);
      deck.rotateY(rad);
      parts.push(deck);

      const railL = new THREE.BoxGeometry(3.6, 0.45, 0.12);
      railL.translate(5.8, 0.78, -0.72);
      railL.rotateY(rad);
      parts.push(railL);

      const railR = new THREE.BoxGeometry(3.6, 0.45, 0.12);
      railR.translate(5.8, 0.78, 0.72);
      railR.rotateY(rad);
      parts.push(railR);
    });

    return mergeGeometries(parts, false);
  }, []);

  useEffect(() => {
    return () => {
      waterBasinStarGeo.dispose();
      innerWalkwayStarGeo.dispose();
      mergedBridgesAndPodiumGeo?.dispose();
    };
  }, [waterBasinStarGeo, innerWalkwayStarGeo, mergedBridgesAndPodiumGeo]);

  const topiaryPositions = useMemo(() => {
    const items: { x: number; z: number; sx: number; sy: number }[] = [];
    const corners = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    corners.forEach(([cx, cz]) => {
      items.push({ x: cx * 12.5, z: cz * 12.5, sx: 0.95, sy: 1.25 });
      items.push({ x: cx * 10.2, z: cz * 13.2, sx: 0.75, sy: 0.9 });
      items.push({ x: cx * 13.2, z: cz * 10.2, sx: 0.75, sy: 0.9 });
      items.push({ x: cx * 8.0, z: cz * 13.4, sx: 0.65, sy: 0.75 });
      items.push({ x: cx * 13.4, z: cz * 8.0, sx: 0.65, sy: 0.75 });
    });
    return items;
  }, []);

  useLayoutEffect(() => {
    _quat.identity();
    topiaryPositions.forEach((t, i) => {
      _pos.set(t.x, 0.25 + t.sy * 0.5, t.z);
      _scale.set(t.sx, t.sy, t.sx);
      _mat.compose(_pos, _quat, _scale);
      shrubMeshRef.current?.setMatrixAt(i, _mat);
    });
    if (shrubMeshRef.current) {
      shrubMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [topiaryPositions]);

  const facingRad = THREE.MathUtils.degToRad(facingDeg);

  return (
    <group
      position={position}
      rotation={[0, facingRad, 0]}
      name="landmark-star-plaza"
    >
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[5.2, 2.5, 5.2]} position={[0, 2.5, 0]} />
        {hotspot && (
          <HotspotSensor
            hotspot={hotspot}
            defaultSize={[width + 9, 8, depth + 9]}
            offset={[0, 3.0, 0]}
          />
        )}
      </RigidBody>

      {/* 1. Nền quảng trường lát gạch hồng đất */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[width, 0.24, depth]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.plazaPinkTile} roughness={0.82} />
      </mesh>

      {/* 2. Lòng rãnh nước hình ngôi sao 8 cánh ở các mũi nhọn */}
      <mesh geometry={waterBasinStarGeo} position={[0, 0.23, 0]}>
        <meshStandardMaterial
          color={CAMPUS_PALETTE.waterShallow}
          roughness={0.22}
          metalness={0.2}
        />
      </mesh>

      {/* 3. Mặt sàn ngôi sao trắng ngà */}
      <mesh geometry={innerWalkwayStarGeo} position={[0, 0.24, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={CAMPUS_PALETTE.ivoryWhite} roughness={0.58} />
      </mesh>

      {/* 4. Đài bát giác + 4 Cầu dẫn + Lan can (gộp thành 1 Mesh) */}
      {mergedBridgesAndPodiumGeo && (
        <mesh geometry={mergedBridgesAndPodiumGeo} receiveShadow castShadow>
          <meshStandardMaterial color={CAMPUS_PALETTE.ivoryWhite} roughness={0.58} />
        </mesh>
      )}

      {/* 4. Quả địa cầu vàng kim ở chính giữa quảng trường */}
      <GlobeFountain position={[0, 0.72, 0]} />

      {/* 5. Bồn cây cắt tỉa tròn quanh 4 góc quảng trường */}
      <instancedMesh
        ref={shrubMeshRef}
        args={[undefined, undefined, topiaryPositions.length]}
        castShadow
      >
        <dodecahedronGeometry args={[0.85, 1]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.hedgeGreen} roughness={0.82} flatShading />
      </instancedMesh>

      {/* 6. Nhãn Hotspot đồng bộ khoảng cách */}
      {hotspot && <HotspotLabel hotspot={hotspot} position={[0, 8.2, 0]} />}
    </group>
  );
}
