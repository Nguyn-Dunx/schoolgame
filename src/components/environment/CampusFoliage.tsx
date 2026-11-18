import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';

interface CampusFoliageProps {
  /** Hệ số mật độ cây (0.55 cho low, 0.7 cho medium, 1.0 cho high) */
  density?: number;
}

/**
 * Tạo mảng cây cối có lọc theo tỷ lệ `density` thực sự (tier medium = 0.7 sẽ giảm 30% số lượng cây so với high = 1.0).
 * Đặc biệt: Cây phượng gồm Tán lá xanh + Các chùm hoa đỏ cam rải điểm phía trên tán (không còn là khối cầu đỏ đặc).
 */
function generateFoliagePositions(density = 1.0) {
  const allPalms: { x: number; z: number; scale: number; tint: string }[] = [];
  const allBroadleafs: { x: number; z: number; scale: number; tint: string }[] = [];
  const allFlamboyants: { x: number; z: number; scale: number }[] = [];
  const lamps: { x: number; z: number }[] = [];
  const benches: { x: number; z: number; rotY: number }[] = [];

  const greenShades = [
    CAMPUS_PALETTE.broadCanopy1,
    CAMPUS_PALETTE.broadCanopy2,
    CAMPUS_PALETTE.broadCanopy3,
  ];

  // 1. Hàng cọ mặt tiền đường Lạch Tray & ranh Đông
  let idx = 0;
  for (let x = -175; x <= -15; x += 14) {
    allPalms.push({
      x,
      z: -4,
      scale: 1.0 + ((Math.abs(x) % 5) * 0.05),
      tint: idx++ % 2 === 0 ? CAMPUS_PALETTE.palmLeaf : CAMPUS_PALETTE.broadCanopy2,
    });
  }
  for (let x = 14; x <= 75; x += 14) {
    allPalms.push({ x, z: -4, scale: 1.05, tint: CAMPUS_PALETTE.palmLeaf });
  }
  for (let z = -25; z >= -160; z -= 16) {
    allPalms.push({ x: 64, z, scale: 0.95, tint: CAMPUS_PALETTE.palmLeaf });
  }

  // 2. Cây cổ thụ tán rộng có biến thể sắc độ xanh
  const frontPlazaBroad = [
    { x: -45, z: -24, scale: 1.45 },
    { x: -54, z: -28, scale: 1.35 },
    { x: -88, z: -24, scale: 1.5 },
    { x: -96, z: -30, scale: 1.3 },
    { x: -24, z: -72, scale: 1.45 },
    { x: -14, z: -76, scale: 1.5 },
    { x: -4, z: -70, scale: 1.35 },
    { x: 6, z: -74, scale: 1.4 },
    { x: -26, z: -92, scale: 1.35 },
    { x: -16, z: -104, scale: 1.4 },
  ];
  frontPlazaBroad.forEach((b, i) => {
    allBroadleafs.push({ ...b, tint: greenShades[i % greenShades.length] });
  });

  for (let x = -90; x <= 0; x += 15) {
    allBroadleafs.push({
      x,
      z: -166,
      scale: 1.25,
      tint: greenShades[Math.abs(x) % greenShades.length],
    });
  }
  for (let x = -178; x <= -110; x += 14) {
    allBroadleafs.push({ x, z: -206, scale: 1.15, tint: CAMPUS_PALETTE.broadCanopy1 });
    allBroadleafs.push({ x, z: -251, scale: 1.15, tint: CAMPUS_PALETTE.broadCanopy2 });
  }

  // 3. Cây phượng vĩ Hải Phòng (tán xanh + chùm hoa đỏ rải điểm)
  const flamboyantSpots = [
    { x: -34, z: -58, scale: 1.25 },
    { x: -104, z: -58, scale: 1.3 },
    { x: -104, z: -95, scale: 1.2 },
    { x: -104, z: -135, scale: 1.25 },
    { x: 28, z: -85, scale: 1.25 },
    { x: 28, z: -125, scale: 1.2 },
    { x: -120, z: -178, scale: 1.3 },
    { x: -65, z: -178, scale: 1.25 },
    { x: -15, z: -178, scale: 1.3 },
  ];
  allFlamboyants.push(...flamboyantSpots);

  // Lọc chính xác theo hệ số `density` (ví dụ: high = 1.0 giữ 100%, medium = 0.7 giữ ~70%, low = 0.55 giữ ~55%)
  const filterByDensity = <T,>(arr: T[]): T[] => {
    if (density >= 0.99) return arr;
    const targetCount = Math.max(1, Math.round(arr.length * density));
    const result: T[] = [];
    const step = arr.length / targetCount;
    for (let i = 0; i < targetCount; i++) {
      result.push(arr[Math.min(arr.length - 1, Math.floor(i * step))]);
    }
    return result;
  };

  const palms = filterByDensity(allPalms);
  const broadleafs = filterByDensity(allBroadleafs);
  const flamboyants = filterByDensity(allFlamboyants);

  // Sinh các chùm hoa phượng đỏ rải điểm trên vòm tán xanh của mỗi cây phượng (5 chùm hoa nhỏ / cây)
  const blossomClusters: { x: number; y: number; z: number; scale: number; color: string }[] = [];
  const clusterOffsets = [
    { dx: 0, dy: 1.15, dz: 0, s: 0.75, c: CAMPUS_PALETTE.flamboyantRed },
    { dx: 1.35, dy: 0.65, dz: 0.85, s: 0.65, c: CAMPUS_PALETTE.flamboyantOrange },
    { dx: -1.35, dy: 0.7, dz: 0.75, s: 0.68, c: CAMPUS_PALETTE.flamboyantRed },
    { dx: 0.95, dy: 0.6, dz: -1.25, s: 0.62, c: CAMPUS_PALETTE.flamboyantRed },
    { dx: -1.1, dy: 0.65, dz: -1.1, s: 0.65, c: CAMPUS_PALETTE.flamboyantOrange },
  ];

  flamboyants.forEach((tree) => {
    const baseCanopyY = 4.2 * tree.scale;
    clusterOffsets.forEach((off) => {
      blossomClusters.push({
        x: tree.x + off.dx * tree.scale,
        y: baseCanopyY + off.dy * tree.scale,
        z: tree.z + off.dz * tree.scale,
        scale: off.s * tree.scale,
        color: off.c,
      });
    });
  });

  // 4. Cột đèn & ghế đá
  for (let z = -18; z >= -165; z -= 24) {
    lamps.push({ x: -102, z });
    lamps.push({ x: 28, z });
    benches.push({ x: -101, z: z - 6, rotY: Math.PI / 2 });
    benches.push({ x: 27, z: z - 6, rotY: -Math.PI / 2 });
  }

  return { palms, broadleafs, flamboyants, blossomClusters, lamps, benches };
}

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _color = new THREE.Color();

export function CampusFoliage({ density = 1.0 }: CampusFoliageProps) {
  const data = useMemo(() => generateFoliagePositions(density), [density]);

  const palmTrunkRef = useRef<THREE.InstancedMesh>(null);
  const palmCrownRef = useRef<THREE.InstancedMesh>(null);

  const broadTrunkRef = useRef<THREE.InstancedMesh>(null);
  const broadCanopyRef = useRef<THREE.InstancedMesh>(null);

  const flamboyantTrunkRef = useRef<THREE.InstancedMesh>(null);
  const flamboyantGreenCanopyRef = useRef<THREE.InstancedMesh>(null);
  const flamboyantBlossomRef = useRef<THREE.InstancedMesh>(null);

  const lampPoleRef = useRef<THREE.InstancedMesh>(null);
  const benchRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    _quat.identity();

    // 1. Cây cọ
    data.palms.forEach((item, i) => {
      _pos.set(item.x, 3.2 * item.scale, item.z);
      _scale.set(item.scale, item.scale, item.scale);
      _mat.compose(_pos, _quat, _scale);
      palmTrunkRef.current?.setMatrixAt(i, _mat);

      _pos.set(item.x, 6.4 * item.scale, item.z);
      _scale.set(item.scale * 1.4, item.scale * 0.65, item.scale * 1.4);
      _mat.compose(_pos, _quat, _scale);
      palmCrownRef.current?.setMatrixAt(i, _mat);
      palmCrownRef.current?.setColorAt(i, _color.set(item.tint));
    });

    // 2. Cây cổ thụ tán rộng (có biến thể sắc độ xanh qua instanceColor)
    data.broadleafs.forEach((item, i) => {
      _pos.set(item.x, 1.8 * item.scale, item.z);
      _scale.set(item.scale, item.scale, item.scale);
      _mat.compose(_pos, _quat, _scale);
      broadTrunkRef.current?.setMatrixAt(i, _mat);

      _pos.set(item.x, 4.8 * item.scale, item.z);
      _scale.set(item.scale * 1.25, item.scale, item.scale * 1.25);
      _mat.compose(_pos, _quat, _scale);
      broadCanopyRef.current?.setMatrixAt(i, _mat);
      broadCanopyRef.current?.setColorAt(i, _color.set(item.tint));
    });

    // 3. Cây phượng: Thân + Tán lá xanh rộng + Chùm hoa đỏ cam rải điểm phía trên
    data.flamboyants.forEach((item, i) => {
      _pos.set(item.x, 1.7 * item.scale, item.z);
      _scale.set(item.scale, item.scale, item.scale);
      _mat.compose(_pos, _quat, _scale);
      flamboyantTrunkRef.current?.setMatrixAt(i, _mat);

      _pos.set(item.x, 4.2 * item.scale, item.z);
      _scale.set(item.scale * 1.55, item.scale * 0.68, item.scale * 1.55);
      _mat.compose(_pos, _quat, _scale);
      flamboyantGreenCanopyRef.current?.setMatrixAt(i, _mat);
    });

    data.blossomClusters.forEach((cluster, i) => {
      _pos.set(cluster.x, cluster.y, cluster.z);
      _scale.set(cluster.scale * 1.35, cluster.scale * 0.65, cluster.scale * 1.35);
      _mat.compose(_pos, _quat, _scale);
      flamboyantBlossomRef.current?.setMatrixAt(i, _mat);
      flamboyantBlossomRef.current?.setColorAt(i, _color.set(cluster.color));
    });

    // 4. Đèn đường & Ghế đá
    data.lamps.forEach((item, i) => {
      _pos.set(item.x, 2.8, item.z);
      _scale.set(1, 1, 1);
      _mat.compose(_pos, _quat, _scale);
      lampPoleRef.current?.setMatrixAt(i, _mat);
    });

    data.benches.forEach((item, i) => {
      _pos.set(item.x, 0.35, item.z);
      _quat.setFromAxisAngle(_yAxis, item.rotY);
      _scale.set(1, 1, 1);
      _mat.compose(_pos, _quat, _scale);
      benchRef.current?.setMatrixAt(i, _mat);
    });

    [
      palmTrunkRef,
      palmCrownRef,
      broadTrunkRef,
      broadCanopyRef,
      flamboyantTrunkRef,
      flamboyantGreenCanopyRef,
      flamboyantBlossomRef,
      lampPoleRef,
      benchRef,
    ].forEach((ref) => {
      if (ref.current) {
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      }
    });
  }, [data]);

  return (
    <group name="campus-foliage-instanced">
      {/* Loại 1: Cây cọ */}
      <instancedMesh ref={palmTrunkRef} args={[undefined, undefined, data.palms.length]}>
        <cylinderGeometry args={[0.18, 0.32, 6.4, 7]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.palmTrunk} roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={palmCrownRef} args={[undefined, undefined, data.palms.length]} castShadow>
        <dodecahedronGeometry args={[1.8, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.72} flatShading />
      </instancedMesh>

      {/* Loại 2: Cây tán rộng có biến thể sắc độ xanh */}
      <instancedMesh ref={broadTrunkRef} args={[undefined, undefined, data.broadleafs.length]}>
        <cylinderGeometry args={[0.28, 0.45, 3.6, 7]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.treeTrunk} roughness={0.88} />
      </instancedMesh>
      <instancedMesh
        ref={broadCanopyRef}
        args={[undefined, undefined, data.broadleafs.length]}
        castShadow
      >
        <icosahedronGeometry args={[2.8, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.75} flatShading />
      </instancedMesh>

      {/* Loại 3: Cây phượng vĩ (Tán lá xanh chủ đạo + Các chùm hoa đỏ cam rải điểm) */}
      <instancedMesh
        ref={flamboyantTrunkRef}
        args={[undefined, undefined, data.flamboyants.length]}
      >
        <cylinderGeometry args={[0.25, 0.4, 3.4, 7]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.treeTrunk} roughness={0.88} />
      </instancedMesh>
      <instancedMesh
        ref={flamboyantGreenCanopyRef}
        args={[undefined, undefined, data.flamboyants.length]}
        castShadow
      >
        <icosahedronGeometry args={[2.3, 1]} />
        <meshStandardMaterial
          color={CAMPUS_PALETTE.flamboyantCanopyGreen}
          roughness={0.75}
          flatShading
        />
      </instancedMesh>
      <instancedMesh
        ref={flamboyantBlossomRef}
        args={[undefined, undefined, data.blossomClusters.length]}
        castShadow
      >
        <dodecahedronGeometry args={[1.15, 0]} />
        <meshStandardMaterial color="#ffffff" roughness={0.65} flatShading />
      </instancedMesh>

      {/* Cột đèn & Ghế đá */}
      <instancedMesh ref={lampPoleRef} args={[undefined, undefined, data.lamps.length]}>
        <cylinderGeometry args={[0.08, 0.12, 5.6, 6]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={benchRef} args={[undefined, undefined, data.benches.length]}>
        <boxGeometry args={[1.8, 0.5, 0.6]} />
        <meshStandardMaterial color="#D8DDE3" roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
