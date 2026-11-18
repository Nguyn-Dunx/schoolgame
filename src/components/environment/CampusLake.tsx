import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';

interface CampusLakeProps {
  position: [number, number, number];
  size: [number, number, number];
}

const waterVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave1 = sin(pos.x * 0.25 + uTime * 1.4) * 0.06;
    float wave2 = cos(pos.y * 0.35 + uTime * 1.1) * 0.05;
    pos.z += wave1 + wave2;
    vWave = wave1 + wave2;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform vec3 uShallowColor;
  uniform vec3 uDeepColor;
  uniform vec3 uSunHighlight;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    float edgeFactor = smoothstep(0.0, 0.22, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    vec3 baseColor = mix(uShallowColor, uDeepColor, edgeFactor);
    float crest = smoothstep(0.03, 0.09, vWave);
    vec3 finalColor = mix(baseColor, uSunHighlight, crest * 0.28);
    gl_FragColor = vec4(finalColor, 0.92);
  }
`;

export function CampusLake({ position, size }: CampusLakeProps) {
  const [width, , depth] = size;
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShallowColor: { value: new THREE.Color(CAMPUS_PALETTE.waterShallow) },
      uDeepColor: { value: new THREE.Color(CAMPUS_PALETTE.waterDeep) },
      uSunHighlight: { value: new THREE.Color(CAMPUS_PALETTE.sunsetHorizon) },
    }),
    []
  );

  const copingAndRailingGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const wallT = 0.8;
    const wallH = 0.75;

    const north = new THREE.BoxGeometry(width + wallT * 2, wallH, wallT);
    north.translate(0, wallH / 2, -depth / 2 - wallT / 2);
    parts.push(north);

    const south = new THREE.BoxGeometry(width + wallT * 2, wallH, wallT);
    south.translate(0, wallH / 2, depth / 2 + wallT / 2);
    parts.push(south);

    const west = new THREE.BoxGeometry(wallT, wallH, depth);
    west.translate(-width / 2 - wallT / 2, wallH / 2, 0);
    parts.push(west);

    const east = new THREE.BoxGeometry(wallT, wallH, depth);
    east.translate(width / 2 + wallT / 2, wallH / 2, 0);
    parts.push(east);

    return mergeGeometries(parts, false);
  }, [width, depth]);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <group position={position} name="vmu-campus-lake">
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[width / 2 + 0.8, 1.5, depth / 2 + 0.8]} position={[0, 1.0, 0]} />
      </RigidBody>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <planeGeometry args={[width, depth, 32, 20]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          uniforms={uniforms}
          transparent
        />
      </mesh>

      <mesh geometry={copingAndRailingGeo} receiveShadow castShadow>
        <meshStandardMaterial color={CAMPUS_PALETTE.wallWhite} roughness={0.7} />
      </mesh>
    </group>
  );
}
