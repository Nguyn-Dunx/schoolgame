import { useLayoutEffect, useMemo, useRef } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAMPUS_METRICS, CAMPUS_PALETTE } from '../../theme/campusTheme';

const PARKED_CAR_TRANSFORMS: { pos: [number, number, number]; rotY: number; color: string }[] = [
  { pos: [-152, 0, -52], rotY: 0, color: '#F2F2EE' },
  { pos: [-147, 0, -52], rotY: 0, color: '#CBD5E1' },
  { pos: [-142, 0, -52], rotY: 0, color: '#1E293B' },
  { pos: [-137, 0, -52], rotY: 0, color: '#F2F2EE' },
  { pos: [-126, 0, -52], rotY: 0, color: '#F2F2EE' },
  { pos: [-122, 0, -52], rotY: 0, color: '#94A3B8' },
  { pos: [14, 0, -65], rotY: Math.PI / 2, color: '#C84B31' },
  { pos: [24, 0, -65], rotY: Math.PI / 2, color: '#1E293B' },
  { pos: [34, 0, -65], rotY: Math.PI / 2, color: '#E2E8F0' },
  { pos: [41, 0, -65], rotY: Math.PI / 2, color: '#F2F2EE' },
];

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _color = new THREE.Color();

/**
 * Sinh texture mặt nhựa xám trung bình sáng (#6E7075) để khi nhân với material color
 * không bị tối đen như bản cũ (vốn nhân 2 lần màu #475569).
 */
function createPavingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#E8EAED';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#D0D4DC';
  for (let i = 0; i < 360; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = '#C4C9D2';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(45, 35);
  return tex;
}

export function CampusGround() {
  const carBodyRef = useRef<THREE.InstancedMesh>(null);
  const carCabinRef = useRef<THREE.InstancedMesh>(null);

  const asphaltTex = useMemo(() => createPavingTexture(), []);
  const parkingLinesGeo = useMemo(() => {
    const parts = [-154.5, -149.5, -144.5, -139.5, -134.5, -128.5, -124.5, -119.5].map((xPos) => {
      const g = new THREE.PlaneGeometry(0.25, 5.2);
      g.rotateX(-Math.PI / 2);
      g.translate(xPos, 0.055, -52);
      return g;
    });
    return mergeGeometries(parts, false);
  }, []);

  const centerX = (CAMPUS_METRICS.MIN_X + CAMPUS_METRICS.MAX_X) / 2;
  const centerZ = (CAMPUS_METRICS.MIN_Z + CAMPUS_METRICS.MAX_Z) / 2;

  useLayoutEffect(() => {
    PARKED_CAR_TRANSFORMS.forEach((car, i) => {
      _quat.setFromAxisAngle(_yAxis, car.rotY);

      _pos.set(car.pos[0], 0.45, car.pos[2]);
      _mat4.compose(_pos, _quat, _scale);
      carBodyRef.current?.setMatrixAt(i, _mat4);
      carBodyRef.current?.setColorAt(i, _color.set(car.color));

      _pos.set(car.pos[0], 0.95, car.pos[2] - 0.15);
      _mat4.compose(_pos, _quat, _scale);
      carCabinRef.current?.setMatrixAt(i, _mat4);
    });

    if (carBodyRef.current) {
      carBodyRef.current.instanceMatrix.needsUpdate = true;
      if (carBodyRef.current.instanceColor) carBodyRef.current.instanceColor.needsUpdate = true;
    }
    if (carCabinRef.current) {
      carCabinRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  return (
    <group name="campus-ground-layer">
      <RigidBody type="fixed" colliders={false} friction={1}>
        <CuboidCollider
          args={[CAMPUS_METRICS.WIDTH / 2 + 30, 0.5, CAMPUS_METRICS.DEPTH / 2 + 30]}
          position={[centerX, -0.5, centerZ]}
        />
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0, centerZ]}>
          <planeGeometry args={[CAMPUS_METRICS.WIDTH + 60, CAMPUS_METRICS.DEPTH + 60]} />
          <meshStandardMaterial color={CAMPUS_PALETTE.groundGrass} roughness={0.92} />
        </mesh>
      </RigidBody>

      {/* Đường Lạch Tray phía trước cổng */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0.02, 12]}>
        <planeGeometry args={[CAMPUS_METRICS.WIDTH + 60, 18]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.asphaltParking} roughness={0.85} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0.04, 1.5]}>
        <planeGeometry args={[CAMPUS_METRICS.WIDTH + 40, 4.5]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.sidewalkTile} roughness={0.82} />
      </mesh>

      {/* Sân nhựa chính màu xám trung bình #6E7075 */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-58, 0.03, -34]}>
        <planeGeometry args={[215, 52]} />
        <meshStandardMaterial
          map={asphaltTex}
          color={CAMPUS_PALETTE.asphaltMain}
          roughness={0.82}
        />
      </mesh>

      {/* Các trục đường nội bộ (dùng polygonOffset để khử Z-fighting tại nút giao) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[34, 0.03, -135]}>
        <planeGeometry args={[12, 210]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.asphaltMain} roughness={0.84} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-114, 0.03, -125]}>
        <planeGeometry args={[12, 145]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.asphaltMain} roughness={0.84} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-68, 0.042, -107]}>
        <planeGeometry args={[92, 6]} />
        <meshStandardMaterial
          color={CAMPUS_PALETTE.asphaltMain}
          roughness={0.84}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-65, 0.042, -170]}>
        <planeGeometry args={[150, 8]} />
        <meshStandardMaterial
          color={CAMPUS_PALETTE.asphaltMain}
          roughness={0.84}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      <mesh geometry={parkingLinesGeo}>
        <meshBasicMaterial color={CAMPUS_PALETTE.roadLineWhite} />
      </mesh>

      <instancedMesh
        ref={carBodyRef}
        args={[undefined, undefined, PARKED_CAR_TRANSFORMS.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[2.0, 0.7, 4.2]} />
        <meshStandardMaterial roughness={0.35} metalness={0.25} />
      </instancedMesh>
      <instancedMesh
        ref={carCabinRef}
        args={[undefined, undefined, PARKED_CAR_TRANSFORMS.length]}
      >
        <boxGeometry args={[1.75, 0.5, 2.2]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.glassDark} roughness={0.2} metalness={0.4} />
      </instancedMesh>
    </group>
  );
}
