import { useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';

interface SoccerFieldProps {
  position: [number, number, number];
  size: [number, number, number];
}

function createSoccerFieldTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const stripes = 12;
  const stripeW = canvas.width / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? CAMPUS_PALETTE.soccerGrassLight : CAMPUS_PALETTE.soccerGrassDark;
    ctx.fillRect(i * stripeW, 0, stripeW, canvas.height);
  }

  const padX = 56;
  const padY = 36;
  const fieldW = canvas.width - padX * 2;
  const fieldH = canvas.height - padY * 2;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;

  ctx.strokeRect(padX, padY, fieldW, fieldH);

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, padY);
  ctx.lineTo(canvas.width / 2, canvas.height - padY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 64, 0, Math.PI * 2);
  ctx.stroke();

  const boxW = 135;
  const boxH = 240;
  ctx.strokeRect(padX, (canvas.height - boxH) / 2, boxW, boxH);
  ctx.strokeRect(canvas.width - padX - boxW, (canvas.height - boxH) / 2, boxW, boxH);

  const goalBoxW = 48;
  const goalBoxH = 110;
  ctx.strokeRect(padX, (canvas.height - goalBoxH) / 2, goalBoxW, goalBoxH);
  ctx.strokeRect(canvas.width - padX - goalBoxW, (canvas.height - goalBoxH) / 2, goalBoxW, goalBoxH);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function SoccerField({ position, size }: SoccerFieldProps) {
  const [width, , depth] = size;
  const fieldTexture = useMemo(() => createSoccerFieldTexture(), []);
  const goalsGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    [-width / 2 + 5, width / 2 - 5].forEach((goalX) => {
      const crossbar = new THREE.BoxGeometry(0.18, 0.18, 7.32);
      crossbar.translate(goalX, 2.5, 0);
      const postL = new THREE.BoxGeometry(0.18, 2.44, 0.18);
      postL.translate(goalX, 1.3, -3.66);
      const postR = new THREE.BoxGeometry(0.18, 2.44, 0.18);
      postR.translate(goalX, 1.3, 3.66);
      parts.push(crossbar, postL, postR);
    });
    return mergeGeometries(parts, false);
  }, [width]);

  return (
    <group position={position} name="vmu-soccer-field">
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <planeGeometry args={[width + 8, depth + 8]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.brickPathRed} roughness={0.85} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={fieldTexture} roughness={0.8} />
      </mesh>

      <mesh geometry={goalsGeo}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[28, 3.5, 4.5]} position={[0, 3.5, -depth / 2 - 6]} />
        <group position={[0, 0, -depth / 2 - 6]}>
          <mesh castShadow receiveShadow position={[0, 2.0, 0]}>
            <boxGeometry args={[56, 4.0, 8]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 6.2, 0.8]} rotation={[0.12, 0, 0]}>
            <boxGeometry args={[58, 0.4, 9.5]} />
            <meshStandardMaterial color={CAMPUS_PALETTE.wallCream} roughness={0.6} />
          </mesh>
        </group>
      </RigidBody>
    </group>
  );
}
