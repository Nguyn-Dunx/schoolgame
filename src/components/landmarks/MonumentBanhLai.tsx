import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';
import { Canvas3DText } from '../common/Canvas3DText';

interface MonumentBanhLaiProps {
  position: [number, number, number];
  facingDeg?: number;
}

const flagVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float pinFactor = smoothstep(0.0, 0.15, uv.x);
    float wave = sin(uv.x * 7.0 - uTime * 4.5 + pos.y * 1.5) * 0.22 * pinFactor;
    pos.z += wave;
    pos.y += cos(uv.x * 5.0 - uTime * 3.2) * 0.05 * pinFactor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const flagFragmentShader = /* glsl */ `
  uniform vec3 uFlagColor;
  varying vec2 vUv;

  void main() {
    gl_FragColor = vec4(uFlagColor, 1.0);
  }
`;

/**
 * Đài Biểu Tượng Bánh Lái Tàu & Mỏ Neo (Đã gộp Geometry & thay chữ sang Canvas3DText 100% offline):
 * - Gộp 2 trụ trắng ngà + thanh giằng + 2 trang sách mở thành 1 BufferGeometry (`ivoryWhiteGeo`).
 * - Gộp Bánh lái vàng (2 vành torus + trục tâm + 8 nan hoa) + Mỏ neo vàng + viền bệ vàng thành 1 BufferGeometry (`goldGeo`).
 * - Gộp 3 cột cờ inox thành 1 BufferGeometry (`polesGeo`).
 * - Giảm từ 30 meshes rời xuống chỉ còn 10 meshes!
 */
export function MonumentBanhLai({ position, facingDeg = 0 }: MonumentBanhLaiProps) {
  const flagMat1 = useRef<THREE.ShaderMaterial>(null);
  const flagMat2 = useRef<THREE.ShaderMaterial>(null);
  const flagMat3 = useRef<THREE.ShaderMaterial>(null);

  const { ivoryWhiteGeo, goldGeo, polesGeo } = useMemo(() => {
    const whiteParts: THREE.BufferGeometry[] = [];
    const goldParts: THREE.BufferGeometry[] = [];
    const poleParts: THREE.BufferGeometry[] = [];

    // Offset gốc của cụm trụ đài là (0, 0.65, -2.2)
    const ox = 0;
    const oy = 0.65;
    const oz = -2.2;

    // 1. Hai trụ trắng ngà + thanh giằng ngang + 2 trang sách mở
    [-0.85, 0.85].forEach((px) => {
      const col = new THREE.BoxGeometry(0.78, 11.2, 0.95);
      col.translate(ox + px, oy + 6.4, oz);
      whiteParts.push(col);
    });

    const beam = new THREE.BoxGeometry(2.4, 0.45, 0.8);
    beam.translate(ox, oy + 10.6, oz);
    whiteParts.push(beam);

    const leftPage = new THREE.BoxGeometry(2.1, 2.3, 0.18);
    leftPage.rotateY(0.18);
    leftPage.translate(ox - 1.05, oy + 7.4, oz + 0.74);
    whiteParts.push(leftPage);

    const rightPage = new THREE.BoxGeometry(2.1, 2.3, 0.18);
    rightPage.rotateY(-0.18);
    rightPage.translate(ox + 1.05, oy + 7.4, oz + 0.74);
    whiteParts.push(rightPage);

    // 2. Viền bệ vàng + Bánh lái tàu vàng (Y = oy + 13.6) + Mỏ neo vàng (Y = oy + 2.1, Z = oz + 1.15)
    const baseTrim = new THREE.BoxGeometry(7.4, 0.4, 13.6);
    baseTrim.translate(0, 0.2, 0);
    goldParts.push(baseTrim);

    const wy = oy + 13.6;
    const outerRing = new THREE.TorusGeometry(1.65, 0.16, 10, 28);
    outerRing.translate(ox, wy, oz);
    goldParts.push(outerRing);

    const innerRing = new THREE.TorusGeometry(0.95, 0.1, 8, 24);
    innerRing.translate(ox, wy, oz);
    goldParts.push(innerRing);

    const hub = new THREE.CylinderGeometry(0.38, 0.38, 0.35, 16);
    hub.rotateX(Math.PI / 2);
    hub.translate(ox, wy, oz);
    goldParts.push(hub);

    [0, 45, 90, 135, 180, 225, 270, 315].forEach((deg) => {
      const spoke = new THREE.CylinderGeometry(0.07, 0.09, 4.1, 8);
      spoke.rotateZ(THREE.MathUtils.degToRad(deg));
      spoke.translate(ox, wy, oz);
      goldParts.push(spoke);
    });

    // Mỏ neo vàng ở mặt trước chân trụ
    const ay = oy + 2.1;
    const az = oz + 1.15;
    const anchorShaft = new THREE.CylinderGeometry(0.14, 0.18, 2.6, 10);
    anchorShaft.translate(ox, ay + 0.4, az);
    goldParts.push(anchorShaft);

    const anchorCross = new THREE.CylinderGeometry(0.09, 0.09, 1.4, 8);
    anchorCross.rotateZ(Math.PI / 2);
    anchorCross.translate(ox, ay + 1.35, az);
    goldParts.push(anchorCross);

    const anchorFluke = new THREE.TorusGeometry(0.85, 0.16, 8, 18, Math.PI);
    anchorFluke.rotateZ(Math.PI);
    anchorFluke.translate(ox, ay - 0.35, az);
    goldParts.push(anchorFluke);

    // 3. Ba cột cờ inox ở phía trước (z = +2.6)
    [-1.8, 0, 1.8].forEach((fx) => {
      const pole = new THREE.CylinderGeometry(0.05, 0.09, 10.4, 8);
      pole.translate(fx, 0.65 + 5.2, 2.6);
      poleParts.push(pole);
    });

    return {
      ivoryWhiteGeo: mergeGeometries(whiteParts, false),
      goldGeo: mergeGeometries(goldParts, false),
      polesGeo: mergeGeometries(poleParts, false),
    };
  }, []);

  useEffect(() => {
    return () => {
      ivoryWhiteGeo?.dispose();
      goldGeo?.dispose();
      polesGeo?.dispose();
    };
  }, [ivoryWhiteGeo, goldGeo, polesGeo]);

  const flagUniformsRed = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlagColor: { value: new THREE.Color('#DC2626') },
    }),
    []
  );
  const flagUniformsBlue = useMemo(
    () => ({
      uTime: { value: 0.8 },
      uFlagColor: { value: new THREE.Color('#E0F2FE') },
    }),
    []
  );
  const flagUniformsRed2 = useMemo(
    () => ({
      uTime: { value: 1.6 },
      uFlagColor: { value: new THREE.Color('#EF4444') },
    }),
    []
  );

  useFrame((_, delta) => {
    if (flagMat1.current) flagMat1.current.uniforms.uTime.value += delta;
    if (flagMat2.current) flagMat2.current.uniforms.uTime.value += delta;
    if (flagMat3.current) flagMat3.current.uniforms.uTime.value += delta;
  });

  const facingRad = THREE.MathUtils.degToRad(facingDeg);

  return (
    <group
      position={position}
      rotation={[0, facingRad, 0]}
      name="landmark-monument-banh-lai"
    >
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[3.8, 4.0, 6.8]} position={[0, 4.0, 0]} />
      </RigidBody>

      {/* Bệ đá đỏ & chân đế xám */}
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[6.8, 0.45, 13.0]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.pedestalRed} roughness={0.68} />
      </mesh>
      <mesh position={[0, 1.1, -2.2]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.9, 2.4]} />
        <meshStandardMaterial color={CAMPUS_PALETTE.wallBaseGray} roughness={0.7} />
      </mesh>

      {/* 1 Mesh gộp toàn bộ 2 Trụ trắng ngà + Giằng ngang + 2 Trang sách mở */}
      <mesh geometry={ivoryWhiteGeo} castShadow receiveShadow>
        <meshStandardMaterial color={CAMPUS_PALETTE.ivoryWhite} roughness={0.4} />
      </mesh>

      {/* 1 Mesh gộp toàn bộ Bánh lái vàng kim + Mỏ neo vàng kim + Viền bệ */}
      <mesh geometry={goldGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={CAMPUS_PALETTE.goldMetallic}
          emissive={CAMPUS_PALETTE.goldDark}
          emissiveIntensity={0.2}
          metalness={0.38}
          roughness={0.3}
        />
      </mesh>

      {/* Chữ trên 2 trang sách mở (Offline Canvas3DText) */}
      <Canvas3DText
        text="VMU"
        position={[-1.05, 8.15, -1.34]}
        rotation={[0, 0.18, 0]}
        fontSize={0.48}
        color={CAMPUS_PALETTE.vmuBrandBlue}
        outlineColor=""
      />
      <Canvas3DText
        text="1/4/1956"
        position={[1.05, 8.15, -1.34]}
        rotation={[0, -0.18, 0]}
        fontSize={0.36}
        color={CAMPUS_PALETTE.vmuBrandBlue}
        outlineColor=""
      />

      {/* 1 Mesh gộp cả 3 cột cờ inox */}
      <mesh geometry={polesGeo} castShadow>
        <meshStandardMaterial color="#F2F2EE" metalness={0.45} roughness={0.25} />
      </mesh>

      {/* 3 lá cờ bay bằng Vertex Shader */}
      {[
        { x: -1.8, z: 2.6, matRef: flagMat2, uniforms: flagUniformsBlue },
        { x: 0, z: 2.6, matRef: flagMat1, uniforms: flagUniformsRed },
        { x: 1.8, z: 2.6, matRef: flagMat3, uniforms: flagUniformsRed2 },
      ].map((f, idx) => (
        <mesh key={idx} position={[f.x + 1.1, 10.25, f.z]}>
          <planeGeometry args={[2.2, 1.4, 16, 8]} />
          <shaderMaterial
            ref={f.matRef}
            vertexShader={flagVertexShader}
            fragmentShader={flagFragmentShader}
            uniforms={f.uniforms}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
