import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface Canvas3DTextProps {
  text: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  fontSize?: number;
  color?: string;
  bgColor?: string;
  outlineColor?: string;
  paddingX?: number;
  paddingY?: number;
  doubleSided?: boolean;
}

/**
 * Component vẽ chữ 3D bằng HTML5 CanvasTexture (100% Offline, hỗ trợ hoàn hảo tiếng Việt có dấu):
 * - Thay thế hoàn toàn `<Text>` của `@react-three/drei` (vốn tự động tải font Roboto từ `gstatic.com`
 *   gây treo `LoadingManager` khi mất mạng/tường lửa và lỗi dấu tiếng Việt).
 */
export function Canvas3DText({
  text,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  fontSize = 0.5,
  color = '#FFFFFF',
  bgColor,
  outlineColor = 'rgba(0,0,0,0.65)',
  paddingX = 24,
  paddingY = 14,
  doubleSided = false,
}: Canvas3DTextProps) {
  const { texture, planeWidth, planeHeight } = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const pxFontSize = 64;
    const fontSpec = `bold ${pxFontSize}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.font = fontSpec;

    const metrics = ctx.measureText(text);
    const textW = Math.ceil(metrics.width);
    const rawW = textW + paddingX * 2;
    const rawH = pxFontSize + paddingY * 2;

    canvas.width = Math.max(64, rawW);
    canvas.height = Math.max(32, rawH);

    // Vẽ lại sau khi đổi kích thước canvas
    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    ctx.font = fontSpec;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (outlineColor) {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    }

    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    const aspect = canvas.width / canvas.height;
    const h = fontSize * 1.35;
    const w = h * aspect;

    return { texture: tex, planeWidth: w, planeHeight: h };
  }, [text, fontSize, color, bgColor, outlineColor, paddingX, paddingY]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.04}
        side={doubleSided ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}
