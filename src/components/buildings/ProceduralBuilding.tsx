import { Suspense, useEffect, useMemo, useState } from 'react';
import { useCursor, useGLTF } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BuildingSpec } from '../../types/campusLayout';
import type { HotspotData } from '../../types/hotspot';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';
import { useTourStore } from '../../store/useTourStore';
import {
  getA1GlassWingMullionTexture,
  getFacadeWindowTextures,
} from './windowTextures';
import { DomeTower } from '../landmarks/DomeTower';
import { HotspotLabel } from '../HotspotLabel';
import { HotspotSensor } from '../HotspotSensor';
import { Canvas3DText } from '../common/Canvas3DText';
import { GLBErrorBoundary } from '../common/GLBErrorBoundary';

interface ProceduralBuildingProps {
  spec: BuildingSpec;
  hotspot?: HotspotData;
}

/**
 * Nhánh nạp mô hình GLB nén Draco có `.clone()` để nhiều tòa nhà có thể tái sử dụng chung 1 file `.glb`.
 */
function BuildingGLBBranch({ url }: { url: string }) {
  const { scene } = useGLTF(url, true);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clonedScene} castShadow receiveShadow />;
}

function createHipRoofGeometry(width: number, depth: number, height: number): THREE.BufferGeometry {
  const hw = width / 2 + 0.6;
  const hd = depth / 2 + 0.6;
  const ridgeHalf = Math.max(0.5, hw - hd * 0.85);

  const positions = new Float32Array([
    -hw, 0, hd,
     hw, 0, hd,
     ridgeHalf, height, 0,
    -hw, 0, hd,
     ridgeHalf, height, 0,
    -ridgeHalf, height, 0,

     hw, 0, -hd,
    -hw, 0, -hd,
    -ridgeHalf, height, 0,
     hw, 0, -hd,
    -ridgeHalf, height, 0,
     ridgeHalf, height, 0,

    -hw, 0, -hd,
    -hw, 0,  hd,
    -ridgeHalf, height, 0,

     hw, 0,  hd,
     hw, 0, -hd,
     ridgeHalf, height, 0,
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function createGableRoofGeometry(width: number, depth: number, height: number): THREE.BufferGeometry {
  const hw = width / 2 + 0.6;
  const hd = depth / 2 + 0.6;

  const positions = new Float32Array([
    -hw, 0,  hd,
     0, height, hd,
     0, height, -hd,
    -hw, 0,  hd,
     0, height, -hd,
    -hw, 0, -hd,

     0, height,  hd,
     hw, 0,  hd,
     hw, 0, -hd,
     0, height,  hd,
     hw, 0, -hd,
     0, height, -hd,

    -hw, 0, hd,
     hw, 0, hd,
     0, height, hd,

     hw, 0, -hd,
    -hw, 0, -hd,
     0, height, -hd,
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export function ProceduralBuilding({ spec, hotspot }: ProceduralBuildingProps) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && Boolean(hotspot));

  const setActiveHotspot = useTourStore((s) => s.setActiveHotspot);
  const activeHotspot = useTourStore((s) => s.activeHotspot);

  const [width, depth] = spec.footprint;
  const bodyHeight = spec.floors * spec.floorHeight;
  const roofH = spec.roofHeight ?? 2.6;
  const isSelected = Boolean(hotspot && activeHotspot?.id === hotspot.id);

  const repeatX = Math.max(2, Math.round(width / 7.5));
  const repeatY = Math.max(1, spec.floors);

  const { map: windowMap } = useMemo(
    () => getFacadeWindowTextures(spec.windowStyle, spec.wallColor, repeatX, repeatY),
    [spec.windowStyle, spec.wallColor, repeatX, repeatY]
  );

  const glassWingTex = useMemo(
    () => (spec.hasSideGlassWing ? getA1GlassWingMullionTexture(5, 6) : null),
    [spec.hasSideGlassWing]
  );

  const bodyMaterials = useMemo(() => {
    const tint = isSelected || hovered ? '#BAE6FD' : '#FFFFFF';
    const sideMat = new THREE.MeshStandardMaterial({
      map: windowMap,
      color: tint,
      roughness: 0.72,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: spec.wallColor,
      roughness: 0.82,
    });
    return [sideMat, sideMat, capMat, capMat, sideMat, sideMat];
  }, [windowMap, spec.wallColor, isSelected, hovered]);

  // Gộp toàn bộ dải ban công, sảnh đón 4 cột, giếng trời và khung biển chữ trên mái vào 1 BufferGeometry phụ duy nhất
  const mergedWhiteDetailsGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];

    if (spec.hasBalconies) {
      const count = Math.max(1, spec.floors - 1);
      for (let fIdx = 0; fIdx < count; fIdx++) {
        const yPos = (fIdx + 1) * spec.floorHeight;
        const bal = new THREE.BoxGeometry(width * 0.92, 0.38, 0.9);
        bal.translate(0, yPos, depth / 2 + 0.45);
        parts.push(bal);
      }
    }

    if (spec.hasPortico) {
      const px = spec.porticoOffsetX ?? 0;
      const pz = depth / 2 + 2.6;

      const steps = new THREE.BoxGeometry(12.5, 0.5, 6.2);
      steps.translate(px, 0.25, pz + 0.4);
      parts.push(steps);

      const canopy = new THREE.BoxGeometry(12.2, 0.65, 5.4);
      canopy.translate(px, 4.4, pz);
      parts.push(canopy);

      [-4.8, -1.8, 1.8, 4.8].forEach((colX) => {
        const col = new THREE.BoxGeometry(0.55, 4.2, 0.55);
        col.translate(px + colX, 2.3, pz + 2.1);
        parts.push(col);
      });
    }

    if (spec.roofStyle === 'courtyard-hip') {
      const skylight = new THREE.BoxGeometry(width * 0.45, roofH * 0.9, depth * 0.5);
      skylight.translate(0, bodyHeight + roofH * 0.55, 0);
      parts.push(skylight);
    }

    if (spec.roofSignText) {
      const signBack = new THREE.BoxGeometry(22, 1.5, 0.25);
      signBack.translate(spec.porticoOffsetX ?? -8, bodyHeight + 1.25, depth / 2 - 0.95);
      parts.push(signBack);
    }

    if (parts.length === 0) return null;
    return mergeGeometries(parts, false);
  }, [
    spec.hasBalconies,
    spec.floors,
    spec.floorHeight,
    spec.hasPortico,
    spec.porticoOffsetX,
    spec.roofStyle,
    spec.roofSignText,
    width,
    depth,
    bodyHeight,
    roofH,
  ]);

  const hipRoofGeo = useMemo(
    () =>
      spec.roofStyle === 'hip' || spec.roofStyle === 'courtyard-hip'
        ? createHipRoofGeometry(width, depth, roofH)
        : null,
    [spec.roofStyle, width, depth, roofH]
  );

  const gableRoofGeo = useMemo(
    () => (spec.roofStyle === 'gable' ? createGableRoofGeometry(width, depth, roofH) : null),
    [spec.roofStyle, width, depth, roofH]
  );

  useEffect(() => {
    return () => {
      mergedWhiteDetailsGeo?.dispose();
      hipRoofGeo?.dispose();
      gableRoofGeo?.dispose();
      bodyMaterials.forEach((m) => m.dispose());
    };
  }, [mergedWhiteDetailsGeo, hipRoofGeo, gableRoofGeo, bodyMaterials]);

  const handleSelect = (e: { stopPropagation: () => void }) => {
    if (!hotspot) return;
    e.stopPropagation();
    setActiveHotspot(hotspot);
  };

  const proceduralFallbackContent = (
    <group
      onClick={handleSelect}
      onPointerOver={(e) => {
        if (!hotspot) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* 1. Chân đế ốp đá xám */}
      <mesh position={[0, 0.55, 0]} receiveShadow>
        <boxGeometry args={[width + 0.3, 1.1, depth + 0.3]} />
        <meshStandardMaterial
          color={spec.baseColor ?? CAMPUS_PALETTE.wallBaseGray}
          roughness={0.85}
        />
      </mesh>

      {/* 2. Thân chính tòa nhà (6-material array: mặt nóc & đáy không dán cửa sổ) */}
      <mesh
        position={[0, bodyHeight / 2, 0]}
        material={bodyMaterials}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, bodyHeight, depth]} />
      </mesh>

      {/* 3. Cánh kính xanh có lưới đố trắng 5×6 của Nhà Hiệu Bộ A1 */}
      {spec.hasSideGlassWing && glassWingTex && (
        <>
          <mesh
            position={[width / 2 - 5.2, bodyHeight * 0.64, depth / 2 + 0.08]}
            castShadow
          >
            <boxGeometry args={[10.4, bodyHeight * 0.66, 0.18]} />
            <meshStandardMaterial
              map={glassWingTex}
              roughness={0.28}
              metalness={0.35}
            />
          </mesh>
          <mesh
            position={[-width / 2 + 3.8, bodyHeight * 0.5, depth / 2 + 0.08]}
            castShadow
          >
            <boxGeometry args={[7.4, bodyHeight * 0.92, 0.18]} />
            <meshStandardMaterial
              map={glassWingTex}
              roughness={0.28}
              metalness={0.35}
            />
          </mesh>
        </>
      )}

      {/* 4. Toàn bộ ban công + sảnh đón 4 cột + giếng trời + bảng lưng chữ gộp thành 1 Mesh duy nhất */}
      {mergedWhiteDetailsGeo && (
        <mesh geometry={mergedWhiteDetailsGeo} castShadow receiveShadow>
          <meshStandardMaterial color={CAMPUS_PALETTE.ivoryWhite} roughness={0.62} />
        </mesh>
      )}

      {/* 5. Hệ mái theo tham số */}
      {hipRoofGeo && (
        <mesh
          geometry={hipRoofGeo}
          position={[0, bodyHeight, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={spec.roofColor} roughness={0.65} flatShading />
        </mesh>
      )}

      {gableRoofGeo && (
        <mesh
          geometry={gableRoofGeo}
          position={[0, bodyHeight, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={spec.roofColor} roughness={0.6} flatShading />
        </mesh>
      )}

      {spec.roofStyle === 'flat' && (
        <mesh position={[0, bodyHeight + 0.35, 0]} castShadow>
          <boxGeometry args={[width + 0.4, 0.7, depth + 0.4]} />
          <meshStandardMaterial color={spec.roofColor} roughness={0.78} />
        </mesh>
      )}

      {spec.roofStyle === 'arched-roof' && (
        <group position={[0, bodyHeight, 0]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[width + 0.4, 0.7, depth + 0.4]} />
            <meshStandardMaterial color={CAMPUS_PALETTE.ivoryWhite} roughness={0.7} />
          </mesh>
          <mesh
            position={[0, 0.8, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1, 1, 0.75]}
            castShadow
          >
            <cylinderGeometry
              args={[depth * 0.38, depth * 0.38, width * 0.78, 16, 1, false, 0, Math.PI]}
            />
            <meshStandardMaterial color={spec.roofColor} roughness={0.45} />
          </mesh>
        </group>
      )}

      {spec.hasDomeTower && (
        <DomeTower
          position={[
            spec.domeOffset?.[0] ?? 10,
            bodyHeight,
            spec.domeOffset?.[1] ?? 8,
          ]}
        />
      )}

      {/* Biển chữ nổi trên mái Nhà Hiệu Bộ A1 (100% Offline Canvas3DText) */}
      {spec.roofSignText && (
        <Canvas3DText
          text={spec.roofSignText}
          position={[spec.porticoOffsetX ?? -8, bodyHeight + 1.25, depth / 2 - 0.75]}
          fontSize={0.92}
          color={CAMPUS_PALETTE.vmuBrandBlue}
          outlineColor="#FFFFFF"
        />
      )}
    </group>
  );

  return (
    <group
      position={spec.position}
      rotation={[0, spec.rotationY ?? 0, 0]}
      name={`building-${spec.id}`}
    >
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[width / 2, bodyHeight / 2, depth / 2]}
          position={[0, bodyHeight / 2, 0]}
        />

        {/* Collider phụ cho sảnh đón Portico của Nhà Hiệu Bộ A1 để nhân vật không đi xuyên cột sảnh */}
        {spec.hasPortico && (
          <CuboidCollider
            args={[6.1, 2.2, 2.7]}
            position={[spec.porticoOffsetX ?? 0, 2.2, depth / 2 + 2.6]}
          />
        )}

        {hotspot && (
          <HotspotSensor
            hotspot={hotspot}
            defaultSize={[width + 10, bodyHeight + 4, depth + 10]}
            offset={[0, bodyHeight / 2, 0]}
          />
        )}

        {spec.modelPath ? (
          <GLBErrorBoundary fallback={proceduralFallbackContent}>
            <Suspense fallback={proceduralFallbackContent}>
              <BuildingGLBBranch url={spec.modelPath} />
            </Suspense>
          </GLBErrorBoundary>
        ) : (
          proceduralFallbackContent
        )}
      </RigidBody>

      {hotspot && (
        <HotspotLabel
          hotspot={hotspot}
          position={[0, bodyHeight + roofH + 3.2, 0]}
        />
      )}
    </group>
  );
}
