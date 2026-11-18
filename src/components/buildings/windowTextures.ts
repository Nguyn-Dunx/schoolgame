import * as THREE from 'three';
import type { WindowStyle } from '../../types/campusLayout';
import { CAMPUS_PALETTE } from '../../theme/campusTheme';

interface FacadeTextureBundle {
  map: THREE.CanvasTexture;
}

const textureCache = new Map<string, FacadeTextureBundle>();
let cachedGlassWingMullionTex: THREE.CanvasTexture | null = null;

/**
 * Sinh Procedural CanvasTexture cho mặt đứng tòa nhà:
 * - Khung cửa sổ màu trắng / xám xanh sáng (#E6ECF2), ô kính xanh đậm (#1E3A5F) có vệt phản chiếu nhẹ.
 * - KHÔNG tô màu vàng lên khung hay nền cửa sổ (tránh làm khung cửa sổ bị ám vàng vào ban ngày).
 */
export function getFacadeWindowTextures(
  style: WindowStyle,
  wallColorHex: string,
  repeatX: number,
  repeatY: number
): FacadeTextureBundle {
  const key = `${style}_${wallColorHex}_${repeatX}_${repeatY}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const width = 256;
  const height = 256;

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const dCtx = diffCanvas.getContext('2d')!;

  // Nền tường
  dCtx.fillStyle = wallColorHex;
  dCtx.fillRect(0, 0, width, height);

  // Gờ chỉ phân tầng nhẹ
  dCtx.fillStyle = 'rgba(15, 23, 42, 0.08)';
  dCtx.fillRect(0, height - 12, width, 12);

  if (style === 'horizontal-strip') {
    // Dải cửa sổ ngang: Ô kính xanh đậm + khung đố trắng xám xanh
    dCtx.fillStyle = CAMPUS_PALETTE.glassDark;
    dCtx.fillRect(12, 54, width - 24, 120);

    // Vệt kính phản chiếu bầu trời xanh nhạt
    dCtx.fillStyle = 'rgba(79, 143, 192, 0.28)';
    dCtx.fillRect(16, 58, width - 32, 34);

    dCtx.strokeStyle = CAMPUS_PALETTE.windowFrameLight;
    dCtx.lineWidth = 7;
    dCtx.strokeRect(12, 54, width - 24, 120);
    for (let x = 64; x < width - 24; x += 64) {
      dCtx.beginPath();
      dCtx.moveTo(x, 54);
      dCtx.lineTo(x, 174);
      dCtx.stroke();
    }
  } else if (style === 'curtain-glass') {
    // Vách kính xanh hiện đại
    dCtx.fillStyle = CAMPUS_PALETTE.glassCyan;
    dCtx.fillRect(8, 8, width - 16, height - 16);
    dCtx.fillStyle = CAMPUS_PALETTE.glassDark;
    dCtx.fillRect(16, 16, width - 32, height - 32);

    dCtx.strokeStyle = CAMPUS_PALETTE.windowFrameLight;
    dCtx.lineWidth = 6;
    dCtx.strokeRect(8, 8, width - 16, height - 16);
    dCtx.beginPath();
    dCtx.moveTo(width / 2, 8);
    dCtx.lineTo(width / 2, height - 8);
    dCtx.moveTo(8, height / 2);
    dCtx.lineTo(width - 8, height / 2);
    dCtx.stroke();
  } else {
    // Kiểu 'grid' hoặc 'mixed-a1': Ô kính xanh đậm (#1E3A5F), khung viền & đố cửa trắng/xám xanh (#E6ECF2)
    const winW = 78;
    const winH = 124;
    const positions = [32, 146];

    positions.forEach((wx) => {
      // Lòng kính xanh đậm
      dCtx.fillStyle = CAMPUS_PALETTE.glassDark;
      dCtx.fillRect(wx, 52, winW, winH);

      // Ánh phản chiếu chéo nhẹ trên mặt kính
      dCtx.fillStyle = 'rgba(91, 164, 224, 0.25)';
      dCtx.fillRect(wx + 6, 58, winW - 12, 38);

      // Khung cửa trắng/xám xanh rõ nét
      dCtx.strokeStyle = CAMPUS_PALETTE.windowFrameLight;
      dCtx.lineWidth = 7;
      dCtx.strokeRect(wx, 52, winW, winH);
      dCtx.beginPath();
      dCtx.moveTo(wx + winW / 2, 52);
      dCtx.lineTo(wx + winW / 2, 52 + winH);
      dCtx.moveTo(wx, 52 + winH * 0.42);
      dCtx.lineTo(wx + winW, 52 + winH * 0.42);
      dCtx.stroke();
    });
  }

  const map = new THREE.CanvasTexture(diffCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);

  const bundle = { map };
  textureCache.set(key, bundle);
  return bundle;
}

/**
 * Sinh CanvasTexture chuyên biệt cho Cánh kính xanh đầu hồi của Nhà Hiệu Bộ A1 (Ảnh 1 & 3):
 * - Có khung tường trắng bao ngoài (tạo cảm giác mảng kính lùi nhẹ vào khung tường).
 * - Bên trong là mặt kính xanh (#4F8FC0 -> #1E5688) chia lưới đố kính trắng 5 cột × 6 hàng.
 * - Hoàn toàn bằng 1 Texture duy nhất, KHÔNG thêm hàng chục mesh đố cửa.
 */
export function getA1GlassWingMullionTexture(cols = 5, rows = 6): THREE.CanvasTexture {
  if (cachedGlassWingMullionTex) return cachedGlassWingMullionTex;

  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // 1. Viền khung tường trắng kem bao quanh mảng kính
  const framePad = 24;
  ctx.fillStyle = CAMPUS_PALETTE.wallWhite;
  ctx.fillRect(0, 0, w, h);

  // 2. Bóng đổ hốc tường phía trên & bên trái tạo hiệu ứng kính lùi sâu (recessed glass)
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(framePad - 6, framePad - 6, w - (framePad - 6) * 2, h - (framePad - 6) * 2);

  // 3. Nền kính xanh chuyển sắc nhẹ
  const grad = ctx.createLinearGradient(0, framePad, 0, h - framePad);
  grad.addColorStop(0, '#3B82B6');
  grad.addColorStop(0.5, CAMPUS_PALETTE.glassCyan);
  grad.addColorStop(1, '#1E4E79');
  ctx.fillStyle = grad;
  ctx.fillRect(framePad, framePad, w - framePad * 2, h - framePad * 2);

  // 4. Vẽ lưới đố kính trắng (5 cột × 6 hàng)
  const innerW = w - framePad * 2;
  const innerH = h - framePad * 2;
  ctx.strokeStyle = CAMPUS_PALETTE.ivoryWhite;
  ctx.lineWidth = 6;
  ctx.strokeRect(framePad, framePad, innerW, innerH);

  for (let c = 1; c < cols; c++) {
    const x = framePad + (innerW * c) / cols;
    ctx.beginPath();
    ctx.moveTo(x, framePad);
    ctx.lineTo(x, h - framePad);
    ctx.stroke();
  }

  for (let r = 1; r < rows; r++) {
    const y = framePad + (innerH * r) / rows;
    ctx.beginPath();
    ctx.moveTo(framePad, y);
    ctx.lineTo(w - framePad, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedGlassWingMullionTex = tex;
  return tex;
}
