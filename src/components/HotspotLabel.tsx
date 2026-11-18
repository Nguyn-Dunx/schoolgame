import { useEffect, useMemo, useRef, useState } from 'react';
import { Billboard, useCursor } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HotspotData } from '../types/hotspot';
import { CAMPUS_PALETTE, HOTSPOT_LABEL_CONFIG } from '../theme/campusTheme';
import { useTourStore } from '../store/useTourStore';

interface HotspotLabelProps {
  hotspot: HotspotData;
  position: [number, number, number];
}

const _worldPos = new THREE.Vector3();

/**
 * Nhãn Hotspot nổi (Billboard) vẽ toàn bộ khung viền + nền + chữ tiếng Việt vào 1 CanvasTexture duy nhất:
 * - Tốn đúng 1 Mesh (1 draw call) thay vì 3 Mesh rời.
 * - Không phụ thuộc font CDN ngoài (100% offline, không bao giờ làm kẹt useProgress).
 * - Co giãn đồng đều trong cự ly 10–60m, tự mờ dần khi < 5m hoặc > 70m.
 */
export function HotspotLabel({ hotspot, position }: HotspotLabelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const activeHotspot = useTourStore((s) => s.activeHotspot);
  const setActiveHotspot = useTourStore((s) => s.setActiveHotspot);
  const isSelected = activeHotspot?.id === hotspot.id;

  const { labelTex, widthWorld, heightWorld } = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const fontPx = 44;
    const fontStr = `bold ${fontPx}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.font = fontStr;
    const textW = Math.ceil(ctx.measureText(hotspot.name).width);

    const w = Math.max(280, textW + 72);
    const h = 96;
    canvas.width = w;
    canvas.height = h;

    // Vẽ khung bo góc
    const r = 20;
    ctx.beginPath();
    ctx.moveTo(r, 4);
    ctx.lineTo(w - r, 4);
    ctx.quadraticCurveTo(w - 4, 4, w - 4, r);
    ctx.lineTo(w - 4, h - r);
    ctx.quadraticCurveTo(w - 4, h - 4, w - r, h - 4);
    ctx.lineTo(r, h - 4);
    ctx.quadraticCurveTo(4, h - 4, 4, h - r);
    ctx.lineTo(4, r);
    ctx.quadraticCurveTo(4, 4, r, 4);
    ctx.closePath();

    ctx.fillStyle = isSelected || hovered ? CAMPUS_PALETTE.vmuBrandBlue : 'rgba(15, 23, 42, 0.92)';
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.strokeStyle = isSelected || hovered ? CAMPUS_PALETTE.goldMetallic : '#94A3B8';
    ctx.stroke();

    // Chữ tiếng Việt sắc nét
    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CAMPUS_PALETTE.ivoryWhite;
    ctx.fillText(hotspot.name, w / 2, h / 2 + 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    const hWorld = 1.35;
    const wWorld = hWorld * (w / h);
    return { labelTex: tex, widthWorld: wWorld, heightWorld: hWorld };
  }, [hotspot.name, isSelected, hovered]);

  useEffect(() => {
    return () => {
      labelTex.dispose();
    };
  }, [labelTex]);

  useFrame((state) => {
    const grp = groupRef.current;
    if (!grp) return;

    grp.getWorldPosition(_worldPos);
    const dist = state.camera.position.distanceTo(_worldPos);

    let opacity = 1.0;
    if (dist < HOTSPOT_LABEL_CONFIG.minDist) {
      opacity = THREE.MathUtils.clamp(
        (dist - HOTSPOT_LABEL_CONFIG.fadeNearStart) /
          (HOTSPOT_LABEL_CONFIG.minDist - HOTSPOT_LABEL_CONFIG.fadeNearStart),
        0,
        1
      );
    } else if (dist > 70) {
      opacity = THREE.MathUtils.clamp(
        1 - (dist - 70) / (HOTSPOT_LABEL_CONFIG.fadeFarEnd - 70),
        0,
        1
      );
    }

    grp.visible = opacity > 0.02;
    if (!grp.visible) return;

    const clampedDist = THREE.MathUtils.clamp(dist, 10, HOTSPOT_LABEL_CONFIG.maxClearDist);
    const scale = THREE.MathUtils.clamp(
      clampedDist * HOTSPOT_LABEL_CONFIG.baseScaleFactor,
      HOTSPOT_LABEL_CONFIG.minWorldScale,
      HOTSPOT_LABEL_CONFIG.maxWorldScale
    );
    grp.scale.setScalar(scale);

    if (matRef.current) {
      matRef.current.opacity = opacity;
    }
  });

  return (
    <Billboard position={position} follow={true}>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          setActiveHotspot(hotspot);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <mesh>
          <planeGeometry args={[widthWorld, heightWorld]} />
          <meshBasicMaterial
            ref={matRef}
            map={labelTex}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>
    </Billboard>
  );
}
