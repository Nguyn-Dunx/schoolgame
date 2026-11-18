import { useEffect, useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';
import { Canvas3DText } from '../common/Canvas3DText';

interface ArchGateProps {
  position: [number, number, number];
}

/**
 * Cổng vòm Parabol trắng (Đã gộp Geometry & chuyển bảng chữ sang Canvas3DText 100% offline).
 */
export function ArchGate({ position }: ArchGateProps) {
  const { whiteArchAndGuardGeo, blueTrimGeo } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const spanHalf = 6.8;
    const archHeight = 7.4;
    const segments = 28;

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * 2 - 1;
      const x = t * spanHalf;
      const y = archHeight * (1 - t * t);
      pts.push(new THREE.Vector3(x, Math.max(0, y), 0));
    }

    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 32, 0.52, 10, false);
    tube.scale(1, 1, 1.6);

    const baseL = new THREE.BoxGeometry(1.6, 1.8, 2.2);
    baseL.translate(-6.8, 0.9, 0);

    const baseR = new THREE.BoxGeometry(1.6, 1.8, 2.2);
    baseR.translate(6.8, 0.9, 0);

    const guardBody = new THREE.BoxGeometry(4.2, 3.2, 2.6);
    guardBody.translate(-10.2, 1.6, 0);

    const signBoard = new THREE.BoxGeometry(8.6, 0.95, 0.55);
    signBoard.translate(0, 7.35, 0);

    const guardRoof = new THREE.BoxGeometry(4.6, 0.35, 3.0);
    guardRoof.translate(-10.2, 3.35, 0);

    return {
      whiteArchAndGuardGeo: mergeGeometries([tube, baseL, baseR, guardBody], false),
      blueTrimGeo: mergeGeometries([signBoard, guardRoof], false),
    };
  }, []);

  useEffect(() => {
    return () => {
      whiteArchAndGuardGeo?.dispose();
      blueTrimGeo?.dispose();
    };
  }, [whiteArchAndGuardGeo, blueTrimGeo]);

  return (
    <group position={position} name="landmark-arch-gate-parabol">
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.2, 3.5, 1.2]} position={[-6.8, 3.5, 0]} />
        <CuboidCollider args={[1.2, 3.5, 1.2]} position={[6.8, 3.5, 0]} />
        <CuboidCollider args={[2.5, 2.0, 1.5]} position={[-10.2, 2.0, 0]} />
      </RigidBody>

      {/* Vòm Parabol + 2 Chân đế + Thân bốt bảo vệ = 1 Draw Call */}
      <mesh geometry={whiteArchAndGuardGeo} castShadow receiveShadow>
        <meshStandardMaterial color={CAMPUS_PALETTE.ivoryWhite} roughness={0.48} />
      </mesh>

      {/* Bảng hiệu đỉnh vòm + Mái bốt bảo vệ = 1 Draw Call */}
      <mesh geometry={blueTrimGeo} castShadow>
        <meshStandardMaterial color={CAMPUS_PALETTE.vmuBrandBlue} roughness={0.45} />
      </mesh>

      {/* Chữ 2 mặt trên cổng vòm (100% Offline Canvas3DText) */}
      <Canvas3DText
        text="ĐẠI HỌC HÀNG HẢI VIỆT NAM"
        position={[0, 7.35, 0.3]}
        fontSize={0.38}
        color="#FFFFFF"
        outlineColor=""
      />
      <Canvas3DText
        text="VIETNAM MARITIME UNIVERSITY"
        position={[0, 7.35, -0.3]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.36}
        color="#FFFFFF"
        outlineColor=""
      />
    </group>
  );
}
