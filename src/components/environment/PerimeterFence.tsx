import { useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAMPUS_METRICS, CAMPUS_PALETTE } from '../../theme/campusTheme';

export function PerimeterFence() {
  const { minX, maxX, minZ, maxZ } = {
    minX: CAMPUS_METRICS.MIN_X,
    maxX: CAMPUS_METRICS.MAX_X,
    minZ: CAMPUS_METRICS.MIN_Z,
    maxZ: 0,
  };

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const totalW = maxX - minX;
  const totalD = maxZ - minZ;

  const { brickGeo, grilleGeo } = useMemo(() => {
    const brickParts: THREE.BufferGeometry[] = [];
    const grilleParts: THREE.BufferGeometry[] = [];

    const addFenceSegment = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      postStep = 8
    ) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      const isHorizontal = Math.abs(dx) >= Math.abs(dz);
      const cx = (x1 + x2) / 2;
      const cz = (z1 + z2) / 2;

      const base = isHorizontal
        ? new THREE.BoxGeometry(length, 0.9, 0.35)
        : new THREE.BoxGeometry(0.35, 0.9, length);
      base.translate(cx, 0.45, cz);
      brickParts.push(base);

      const grille = isHorizontal
        ? new THREE.BoxGeometry(length, 1.1, 0.12)
        : new THREE.BoxGeometry(0.12, 1.1, length);
      grille.translate(cx, 1.45, cz);
      grilleParts.push(grille);

      const count = Math.max(2, Math.floor(length / postStep));
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const px = x1 + dx * t;
        const pz = z1 + dz * t;
        const post = new THREE.BoxGeometry(0.55, 2.2, 0.55);
        post.translate(px, 1.1, pz);
        brickParts.push(post);
      }
    };

    addFenceSegment(minX, maxZ, -8, maxZ);
    addFenceSegment(8, maxZ, maxX, maxZ);
    addFenceSegment(minX, minZ, maxX, minZ);
    addFenceSegment(minX, maxZ, minX, minZ);
    addFenceSegment(maxX, maxZ, maxX, minZ);

    return {
      brickGeo: mergeGeometries(brickParts, false),
      grilleGeo: mergeGeometries(grilleParts, false),
    };
  }, [minX, maxX, minZ, maxZ]);

  return (
    <group name="campus-perimeter-fence">
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[totalW / 2, 3, 0.5]} position={[centerX, 3, 4]} />
        <CuboidCollider args={[totalW / 2, 3, 0.5]} position={[centerX, 3, minZ]} />
        <CuboidCollider args={[0.5, 3, totalD / 2]} position={[minX, 3, centerZ]} />
        <CuboidCollider args={[0.5, 3, totalD / 2]} position={[maxX, 3, centerZ]} />
      </RigidBody>

      <mesh geometry={brickGeo} castShadow receiveShadow>
        <meshStandardMaterial color={CAMPUS_PALETTE.roofTerracotta} roughness={0.85} />
      </mesh>
      <mesh geometry={grilleGeo}>
        <meshStandardMaterial color={CAMPUS_PALETTE.vmuBrandBlue} roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}
