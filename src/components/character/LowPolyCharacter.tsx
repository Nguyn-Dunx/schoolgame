import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';

interface LowPolyCharacterProps {
  /** Tham chiếu tốc độ di chuyển hiện tại (0 = đứng yên, >0 = đang đi bộ) */
  speedRef: React.MutableRefObject<number>;
}

/**
 * Nhân vật sinh viên Hàng Hải (VMU) Low-Poly dựng từ các khối Primitive nhẹ:
 * - Đồng phục áo trắng, cầu vai & cà vạt xanh hải quân, quần âu sẫm, balo sau lưng.
 * - Có animation đánh tay, bước chân khi đi bộ và nhịp thở nhẹ khi đứng yên.
 * - Không cấp phát đối tượng mới trong useFrame.
 */
export function LowPolyCharacter({ speedRef }: LowPolyCharacterProps) {
  const rootGroup = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const phaseRef = useRef(0);

  useFrame((state, delta) => {
    const speed = speedRef.current;
    const isMoving = speed > 0.15;

    if (isMoving) {
      phaseRef.current += delta * 10.5;
      const swing = Math.sin(phaseRef.current) * 0.55;

      if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -swing * 0.9;
      if (rightLegRef.current) rightLegRef.current.rotation.x = swing * 0.9;

      // Nhấp nhô thân người theo bước chân
      if (rootGroup.current) {
        rootGroup.current.position.y = -0.9 + Math.abs(Math.cos(phaseRef.current)) * 0.06;
      }
    } else {
      // Trả dần tay chân về tư thế đứng tự nhiên & thở nhẹ
      const damp = Math.min(1, delta * 10);
      if (leftArmRef.current) leftArmRef.current.rotation.x *= 1 - damp;
      if (rightArmRef.current) rightArmRef.current.rotation.x *= 1 - damp;
      if (leftLegRef.current) leftLegRef.current.rotation.x *= 1 - damp;
      if (rightLegRef.current) rightLegRef.current.rotation.x *= 1 - damp;

      if (rootGroup.current) {
        const idleBreath = Math.sin(state.clock.elapsedTime * 2.5) * 0.02;
        rootGroup.current.position.y = -0.9 + idleBreath;
      }
    }
  });

  return (
    <group ref={rootGroup} position={[0, -0.9, 0]} name="vmu-lowpoly-character">
      {/* Đầu & Tóc */}
      <group position={[0, 1.52, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.38, 0.38, 0.38]} />
          <meshStandardMaterial color="#fbd38d" roughness={0.6} />
        </mesh>
        {/* Tóc / Mũ kê-pi hàng hải */}
        <mesh position={[0, 0.18, -0.02]} castShadow>
          <boxGeometry args={[0.42, 0.14, 0.42]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>
        {/* Lưỡi trai mũ phía trước (+Z) */}
        <mesh position={[0, 0.12, 0.22]}>
          <boxGeometry args={[0.36, 0.05, 0.14]} />
          <meshStandardMaterial color={CAMPUS_PALETTE.vmuBrandBlue} roughness={0.4} />
        </mesh>
      </group>

      {/* Thân áo sơ mi trắng đồng phục VMU */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[0.48, 0.62, 0.28]} />
        <meshStandardMaterial color="#ffffff" roughness={0.55} />
      </mesh>
      {/* Cà vạt xanh hải quân ở ngực trước (+Z) */}
      <mesh position={[0, 1.04, 0.15]}>
        <boxGeometry args={[0.09, 0.38, 0.04]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.vmuBrandBlue} roughness={0.5} />
      </mesh>
      {/* Cầu vai vàng xanh */}
      {[-0.2, 0.2].map((sx, idx) => (
        <mesh key={idx} position={[sx, 1.34, 0]}>
          <boxGeometry args={[0.14, 0.04, 0.22]} />
          <meshStandardMaterial color={CAMPUS_PALETTE.goldMetallic} roughness={0.4} />
        </mesh>
      ))}

      {/* Balo sinh viên phía sau lưng (-Z) */}
      <mesh position={[0, 1.02, -0.2]} castShadow>
        <boxGeometry args={[0.36, 0.44, 0.16]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
      </mesh>

      {/* Tay trái */}
      <group ref={leftArmRef} position={[-0.33, 1.26, 0]}>
        <mesh position={[0, -0.24, 0]} castShadow>
          <boxGeometry args={[0.15, 0.52, 0.15]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
      </group>

      {/* Tay phải */}
      <group ref={rightArmRef} position={[0.33, 1.26, 0]}>
        <mesh position={[0, -0.24, 0]} castShadow>
          <boxGeometry args={[0.15, 0.52, 0.15]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
      </group>

      {/* Chân trái (Quần âu xanh đen) */}
      <group ref={leftLegRef} position={[-0.13, 0.7, 0]}>
        <mesh position={[0, -0.34, 0]} castShadow>
          <boxGeometry args={[0.18, 0.68, 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.75} />
        </mesh>
      </group>

      {/* Chân phải */}
      <group ref={rightLegRef} position={[0.13, 0.7, 0]}>
        <mesh position={[0, -0.34, 0]} castShadow>
          <boxGeometry args={[0.18, 0.68, 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.75} />
        </mesh>
      </group>
    </group>
  );
}
