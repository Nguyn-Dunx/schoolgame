#!/usr/bin/env node
/**
 * scripts/audit-layout.mjs
 * Công cụ kiểm toán độc lập (Node.js thuần, không phụ thuộc thư viện ngoài).
 * Đọc src/data/campusLayout.json, src/data/hotspots.json và đối chiếu với các thông số cứng trong code để xuất:
 * 1. layout-preview.svg (bản đồ 2D top-down tỉ lệ 1 đơn vị = 1m)
 * 2. overlaps.txt (mọi cặp chồng lấn AABB/OBB, công trình ngoài ranh giới, kiểm tra hotspot/sensor, độ lệch normPos và cảnh báo dữ liệu)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const layoutPath = path.join(projectRoot, 'src/data/campusLayout.json');
const hotspotsPath = path.join(projectRoot, 'src/data/hotspots.json');

const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
const hotspots = JSON.parse(fs.readFileSync(hotspotsPath, 'utf8'));

const BOUNDS = {
  minX: -228,
  maxX: 92,
  minZ: -275,
  maxZ: 0, // Tường rào mặt tiền nằm tại Z = 0 (PerimeterFence.tsx:12)
  outerMaxZ: 5,
};

const items = [];

for (const b of layout.buildings) {
  const [w, d] = b.footprint || [0, 0];
  const [x, y, z] = b.position || [0, 0, 0];
  const rotY = b.rotationY || 0;
  items.push({
    kind: 'building',
    id: b.id,
    name: b.name,
    x,
    y,
    z,
    w,
    d,
    floors: b.floors,
    floorHeight: b.floorHeight,
    totalHeight: (b.floors || 0) * (b.floorHeight || 0) + (b.roofHeight || 0),
    rotY,
    roofStyle: b.roofStyle,
    wallColor: b.wallColor,
    roofColor: b.roofColor,
    confidence: b.confidence,
    raw: b,
  });
}

for (const l of layout.landmarks) {
  const [w, h, d] = l.size || [0, 0, 0];
  const [x, y, z] = l.position || [0, 0, 0];
  const rotY = l.rotationY || 0;
  items.push({
    kind: 'landmark',
    id: l.id,
    type: l.type,
    name: l.name,
    x,
    y,
    z,
    w,
    d,
    floors: 0,
    floorHeight: h,
    totalHeight: h,
    rotY,
    roofStyle: l.type,
    wallColor: '#38bdf8',
    roofColor: '#0284c7',
    confidence: 'high',
    raw: l,
  });
}

function getAABB(item) {
  const cos = Math.abs(Math.cos(item.rotY || 0));
  const sin = Math.abs(Math.sin(item.rotY || 0));
  const effW = item.w * cos + item.d * sin;
  const effD = item.w * sin + item.d * cos;
  return {
    minX: item.x - effW / 2,
    maxX: item.x + effW / 2,
    minZ: item.z - effD / 2,
    maxZ: item.z + effD / 2,
    effW,
    effD,
  };
}

// 1. Kiểm tra chồng lấn giữa các thực thể trong campusLayout.json
const overlaps = [];
for (let i = 0; i < items.length; i++) {
  const a = items[i];
  const boxA = getAABB(a);
  for (let j = i + 1; j < items.length; j++) {
    const b = items[j];
    const boxB = getAABB(b);
    const overlapX = Math.max(0, Math.min(boxA.maxX, boxB.maxX) - Math.max(boxA.minX, boxB.minX));
    const overlapZ = Math.max(0, Math.min(boxA.maxZ, boxB.maxZ) - Math.max(boxA.minZ, boxB.minZ));
    if (overlapX > 0 && overlapZ > 0) {
      overlaps.push({
        a: a.id,
        b: b.id,
        kindA: a.kind,
        kindB: b.kind,
        overlapX: Number(overlapX.toFixed(2)),
        overlapZ: Number(overlapZ.toFixed(2)),
        area: Number((overlapX * overlapZ).toFixed(2)),
      });
    }
  }
}

// Kiểm tra thêm các hạng mục phụ được hardcode ngoài footprint JSON:
// - Đường chạy điền kinh bao quanh Sân vận động: rộng w+8 (104m), sâu d+8 (70m) tại (-42, 0, -202) -> SoccerField.tsx:66
// - Khán đài phía Bắc Sân vận động: rộng 58m, sâu 9.5m tại (-42, 0, -239) -> SoccerField.tsx:100
// - Sảnh đón Portico của Nhà Hiệu Bộ A1: rộng 12.5m, sâu 6.2m nhô ra phía trước tại (-78, 0, -66.4) -> ProceduralBuilding.tsx:260-263
const hardcodedExtras = [
  {
    kind: 'hardcoded-submesh',
    id: 'soccer-running-track (SoccerField.tsx:66)',
    parentId: 'soccer-field-main',
    x: -42,
    z: -208,
    w: 104,
    d: 64,
    rotY: 0,
  },
  {
    kind: 'hardcoded-submesh',
    id: 'soccer-north-stand (SoccerField.tsx:100)',
    parentId: 'soccer-field-main',
    x: -42,
    z: -239,
    w: 58,
    d: 9.5,
    rotY: 0,
  },
  {
    kind: 'hardcoded-submesh',
    id: 'a1-portico-steps (ProceduralBuilding.tsx:260)',
    parentId: 'nha-hieu-bo-a1',
    x: -78,
    z: -66.4,
    w: 12.5,
    d: 6.2,
    rotY: 0,
  },
];

for (const ex of hardcodedExtras) {
  const boxE = getAABB(ex);
  for (const it of items) {
    if (it.id === ex.parentId) continue;
    const boxI = getAABB(it);
    const ox = Math.max(0, Math.min(boxE.maxX, boxI.maxX) - Math.max(boxE.minX, boxI.minX));
    const oz = Math.max(0, Math.min(boxE.maxZ, boxI.maxZ) - Math.max(boxE.minZ, boxI.minZ));
    if (ox > 0 && oz > 0) {
      overlaps.push({
        a: ex.id,
        b: it.id,
        kindA: ex.kind,
        kindB: it.kind,
        overlapX: Number(ox.toFixed(2)),
        overlapZ: Number(oz.toFixed(2)),
        area: Number((ox * oz).toFixed(2)),
      });
    }
  }
}

// 2. Kiểm tra nằm ngoài ranh giới khuôn viên
const outOfBounds = [];
for (const it of items) {
  const box = getAABB(it);
  const violations = [];
  if (box.minX < BOUNDS.minX) violations.push(`minX=${box.minX.toFixed(1)} < ${BOUNDS.minX}`);
  if (box.maxX > BOUNDS.maxX) violations.push(`maxX=${box.maxX.toFixed(1)} > ${BOUNDS.maxX}`);
  if (box.minZ < BOUNDS.minZ) violations.push(`minZ=${box.minZ.toFixed(1)} < ${BOUNDS.minZ}`);
  if (box.maxZ > BOUNDS.maxZ) {
    violations.push(`maxZ=+${box.maxZ.toFixed(1)}m vượt ra ngoài đường tường rào Z=0 (nằm trên vỉa hè Z=0..5m)`);
  }
  if (violations.length > 0) {
    outOfBounds.push({ id: it.id, kind: it.kind, violations });
  }
}

// 3. Kiểm tra công thức chuyển đổi normPos (u, v) so với position [x, 0, z]
const normPosDrifts = [];
for (const it of items) {
  const [u, v] = it.raw.normPos || [0, 0];
  const expectedX = (u - 0.71) * 320;
  const expectedZ = -v * 280;
  const dx = Math.abs(it.x - expectedX);
  const dz = Math.abs(it.z - expectedZ);
  if (dx > 2.5 || dz > 2.5) {
    normPosDrifts.push({
      id: it.id,
      normPos: [u, v],
      actualXZ: [it.x, it.z],
      expectedXZ: [Number(expectedX.toFixed(1)), Number(expectedZ.toFixed(1))],
      driftM: [Number(dx.toFixed(1)), Number(dz.toFixed(1))],
    });
  }
}

// 4. Phân tích Hotspot
const hotspotReport = [];
for (const h of hotspots) {
  const [hx, , hz] = h.position;
  let nearest = null;
  let minCenterDist = Infinity;
  let minEdgeDist = Infinity;

  for (const it of items) {
    const centerDist = Math.hypot(hx - it.x, hz - it.z);
    const box = getAABB(it);
    const dx = Math.max(box.minX - hx, 0, hx - box.maxX);
    const dz = Math.max(box.minZ - hz, 0, hz - box.maxZ);
    const edgeDist = Math.hypot(dx, dz);

    if (centerDist < minCenterDist) {
      minCenterDist = centerDist;
      minEdgeDist = edgeDist;
      nearest = it;
    }
  }

  const matchedBuilding = layout.buildings.find((b) => b.id === h.id);
  const matchedLandmark = layout.landmarks.find((l) => l.id === h.id);
  const hasSensorInCode = Boolean(matchedBuilding || (matchedLandmark && matchedLandmark.id === "star-plaza-main"));

  hotspotReport.push({
    id: h.id,
    name: h.name,
    position: h.position,
    nearestId: nearest ? nearest.id : 'NONE',
    centerDistM: Number(minCenterDist.toFixed(2)),
    edgeDistM: Number(minEdgeDist.toFixed(2)),
    withinSensor4_5m: minEdgeDist <= 4.5,
    hasSensorColliderInCode: hasSensorInCode,
    matchedType: matchedBuilding ? 'building (HotspotSensor)' : matchedLandmark ? 'landmark (HotspotSensor in StarPlaza.tsx)' : 'unmatched',
    todoVerify: Boolean(h.TODO_VERIFY),
  });
}

const buildingsWithoutHotspot = layout.buildings
  .filter((b) => !hotspots.some((h) => h.id === b.id))
  .map((b) => b.id);

const landmarksWithoutHotspot = layout.landmarks
  .filter((l) => !hotspots.some((h) => h.id === l.id))
  .map((l) => l.id);

// 5. Cảnh báo dữ liệu bất thường & kiểm tra chồng lấn giữa các trục đường/xe đỗ với tòa nhà
const dataWarnings = [];
for (const b of layout.buildings) {
  if (!b.id || !b.name || !b.position || !b.footprint) {
    dataWarnings.push(`[MISSING_FIELD] ${b.id}: Thiếu trường bắt buộc.`);
  }
  const [w, d] = b.footprint;
  if (w <= 0 || d <= 0 || b.floors <= 0 || b.floorHeight <= 0) {
    dataWarnings.push(`[NEGATIVE_OR_ZERO] ${b.id}: Kích thước hoặc số tầng <= 0.`);
  }
  if (b.floors > 12) {
    dataWarnings.push(`[UNUSUAL_FLOORS] ${b.id}: Số tầng quá cao (${b.floors}).`);
  }
  if (b.floorHeight < 2.8 || b.floorHeight > 6.0) {
    dataWarnings.push(`[UNUSUAL_FLOOR_HEIGHT] ${b.id}: Chiều cao tầng bất thường (${b.floorHeight}m).`);
  }
  if (w > 80 || d > 80) {
    dataWarnings.push(`[LARGE_FOOTPRINT] ${b.id}: Footprint rất lớn (${w}x${d}m).`);
  }
  if (b.confidence === 'low') {
    dataWarnings.push(`[LOW_CONFIDENCE] ${b.id} (${b.name}): Đang đánh dấu độ tin cậy thấp ('low').`);
  }
}

// Kiểm tra xem trục đường nội bộ có đè xuyên qua chân tòa nhà nào không
const roads = [
  { id: 'front-asphalt-plaza (CampusGround.tsx:108)', x: -58, z: -34, w: 215, d: 52 },
  { id: 'east-road-X34 (CampusGround.tsx:117)', x: 34, z: -135, w: 12, d: 210 },
  { id: 'west-mid-road-X-114 (CampusGround.tsx:121)', x: -114, z: -125, w: 12, d: 145 },
  { id: 'cross-road-Z-107 (CampusGround.tsx:125)', x: -68, z: -107, w: 92, d: 6 },
  { id: 'cross-road-Z-170 (CampusGround.tsx:129)', x: -65, z: -170, w: 150, d: 8 },
];
for (const r of roads) {
  const boxR = getAABB({ ...r, rotY: 0 });
  for (const it of items) {
    if (it.id === 'star-plaza-main' || it.id === 'monument-banh-lai-main') continue;
    const boxI = getAABB(it);
    const ox = Math.max(0, Math.min(boxR.maxX, boxI.maxX) - Math.max(boxR.minX, boxI.minX));
    const oz = Math.max(0, Math.min(boxR.maxZ, boxI.maxZ) - Math.max(boxR.minZ, boxI.minZ));
    if (ox > 0 && oz > 0) {
      dataWarnings.push(
        `[ROAD_BUILDING_OVERLAP] Mặt đường "${r.id}" đè dưới chân "${it.id}" (ΔX=${ox.toFixed(1)}m, ΔZ=${oz.toFixed(1)}m, S=${(ox * oz).toFixed(1)}m²)`
      );
    }
  }
}

const reportLines = [];
reportLines.push('====================================================================');
reportLines.push('BÁO CÁO KIỂM TOÁN DỮ LIỆU MẶT BẰNG (scripts/audit-layout.mjs)');
reportLines.push('====================================================================\n');

reportLines.push(`Tổng số tòa nhà (buildings): ${layout.buildings.length}`);
reportLines.push(`Tổng số cụm cảnh quan (landmarks): ${layout.landmarks.length}`);
reportLines.push(`Tổng số hotspot trong hotspots.json: ${hotspots.length}\n`);

reportLines.push('--- 1. CÁC CẶP CHỒNG LẤN FOOTPRINT (AABB / OBB & SUB-STRUCTURES) ---');
if (overlaps.length === 0) {
  reportLines.push('Không có cặp công trình/landmark nào chồng lấn trực tiếp.');
} else {
  for (const ov of overlaps) {
    reportLines.push(
      `- [OVERLAP] "${ov.a}" (${ov.kindA}) chồng lấn với "${ov.b}" (${ov.kindB}): ΔX=${ov.overlapX}m, ΔZ=${ov.overlapZ}m -> Diện tích chồng lấn = ${ov.area} m²`
    );
  }
}
reportLines.push('');

reportLines.push('--- 2. CÔNG TRÌNH NẰM NGOÀI RANH GIỚI TƯỜNG RÀO KHUÔN VIÊN (X: [-228, 92], Z: [-275, 0]) ---');
if (outOfBounds.length === 0) {
  reportLines.push('Tất cả công trình đều nằm trọn trong ranh giới.');
} else {
  for (const ob of outOfBounds) {
    reportLines.push(`- [OUT_OF_BOUNDS] "${ob.id}" (${ob.kind}): ${ob.violations.join('; ')}`);
  }
}
reportLines.push('');

reportLines.push('--- 3. KIỂM TRA HOTSPOT & VÙNG SENSOR ---');
for (const hr of hotspotReport) {
  reportLines.push(
    `- Hotspot "${hr.id}" (${hr.name}): pos=[${hr.position.join(', ')}], gần nhất="${hr.nearestId}" (cách tâm ${hr.centerDistM}m, cách mép ${hr.edgeDistM}m), trong vùng 4.5m=${hr.withinSensor4_5m}, có Sensor Collider trong code=${hr.hasSensorColliderInCode} [${hr.matchedType}], TODO_VERIFY=${hr.todoVerify}`
  );
}
reportLines.push(`\n- Công trình (buildings) CHƯA có hotspot (${buildingsWithoutHotspot.length}/${layout.buildings.length}): ${buildingsWithoutHotspot.join(', ')}`);
reportLines.push(`- Landmark CHƯA có hotspot (${landmarksWithoutHotspot.length}/${layout.landmarks.length}): ${landmarksWithoutHotspot.join(', ')}\n`);

reportLines.push('--- 4. ĐỘ LỆCH GIỮA normPos [u, v] VÀ position [X, Z] (> 2.5m) ---');
for (const d of normPosDrifts) {
  reportLines.push(
    `- [NORM_DRIFT] "${d.id}": normPos=[${d.normPos.join(', ')}] -> Công thức ra [${d.expectedXZ.join(', ')}], nhưng JSON ghi [${d.actualXZ.join(', ')}] (Lệch ΔX=${d.driftM[0]}m, ΔZ=${d.driftM[1]}m)`
  );
}
reportLines.push('');

reportLines.push('--- 5. CẢNH BÁO DỮ LIỆU, GIAO THÔNG ĐÈ CÔNG TRÌNH & ĐỘ TIN CẬY ---');
for (const w of dataWarnings) {
  reportLines.push(`- ${w}`);
}

const overlapsTxtPath = path.join(projectRoot, 'overlaps.txt');
fs.writeFileSync(overlapsTxtPath, reportLines.join('\n'), 'utf8');

// Xuất file layout-preview.svg
const scale = 3;
const pad = 40;
const minMapX = -240;
const maxMapX = 105;
const minMapZ = -285;
const maxMapZ = 25;

const svgW = (maxMapX - minMapX) * scale + pad * 2;
const svgH = (maxMapZ - minMapZ) * scale + pad * 2;

const toSvgX = (x) => pad + (x - minMapX) * scale;
const toSvgY = (z) => pad + (z - minMapZ) * scale;

const svgElements = [];
svgElements.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="background:#0f172a;font-family:monospace;">`);
svgElements.push(`<title>VMU Campus Tour 3D - Layout Audit Preview (1m = ${scale}px)</title>`);

svgElements.push(`<g stroke="#1e293b" stroke-width="1">`);
for (let x = -220; x <= 100; x += 20) {
  const sx = toSvgX(x);
  svgElements.push(`<line x1="${sx}" y1="${pad}" x2="${sx}" y2="${svgH - pad}" />`);
  svgElements.push(`<text x="${sx + 2}" y="${svgH - pad + 14}" fill="#64748b" font-size="9">X=${x}</text>`);
}
for (let z = -280; z <= 20; z += 20) {
  const sy = toSvgY(z);
  svgElements.push(`<line x1="${pad}" y1="${sy}" x2="${svgW - pad}" y2="${sy}" />`);
  svgElements.push(`<text x="4" y="${sy + 3}" fill="#64748b" font-size="9">Z=${z}</text>`);
}
svgElements.push(`</g>`);

const fenceX = toSvgX(BOUNDS.minX);
const fenceY = toSvgY(BOUNDS.minZ);
const fenceW = (BOUNDS.maxX - BOUNDS.minX) * scale;
const fenceH = (BOUNDS.maxZ - BOUNDS.minZ) * scale;
svgElements.push(`<rect x="${fenceX}" y="${fenceY}" width="${fenceW}" height="${fenceH}" fill="#1e293b" fill-opacity="0.35" stroke="#f97316" stroke-width="2" stroke-dasharray="6,4" />`);

for (const r of roads) {
  const rx = toSvgX(r.x - r.w / 2);
  const ry = toSvgY(r.z - r.d / 2);
  svgElements.push(`<rect x="${rx}" y="${ry}" width="${r.w * scale}" height="${r.d * scale}" fill="#475569" fill-opacity="0.45" stroke="#64748b" stroke-dasharray="2,2" />`);
}

for (const l of layout.landmarks) {
  const [w, , d] = l.size;
  const [x, , z] = l.position;
  const lx = toSvgX(x - w / 2);
  const ly = toSvgY(z - d / 2);
  let fill = '#0284c7';
  if (l.type === 'soccer-field') fill = '#16a34a';
  if (l.type === 'campus-lake') fill = '#0d9488';
  if (l.type === 'star-plaza') fill = '#eab308';
  if (l.type === 'monument-banh-lai') fill = '#ef4444';
  if (l.type === 'arch-gate') fill = '#f8fafc';

  svgElements.push(`<g>`);
  svgElements.push(`<rect x="${lx}" y="${ly}" width="${w * scale}" height="${d * scale}" fill="${fill}" fill-opacity="0.55" stroke="#ffffff" stroke-width="1.5" />`);
  svgElements.push(`<text x="${toSvgX(x)}" y="${toSvgY(z)}" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">${l.id}</text>`);
  svgElements.push(`</g>`);
}

for (const b of layout.buildings) {
  const [w, d] = b.footprint;
  const [x, , z] = b.position;
  const bx = toSvgX(x - w / 2);
  const by = toSvgY(z - d / 2);
  const cx = toSvgX(x);
  const cy = toSvgY(z);
  const rotDeg = ((b.rotationY || 0) * 180) / Math.PI;

  svgElements.push(`<g transform="rotate(${rotDeg} ${cx} ${cy})">`);
  svgElements.push(`<rect x="${bx}" y="${by}" width="${w * scale}" height="${d * scale}" fill="${b.roofColor || '#c2410c'}" fill-opacity="0.8" stroke="${b.wallColor || '#ffffff'}" stroke-width="2" />`);
  svgElements.push(`<text x="${cx}" y="${cy - 3}" fill="#ffffff" font-size="9.5" font-weight="bold" text-anchor="middle">${b.id}</text>`);
  svgElements.push(`<text x="${cx}" y="${cy + 9}" fill="#fef08a" font-size="8.5" text-anchor="middle">${b.floors}F (${w}x${d}m)</text>`);
  svgElements.push(`</g>`);
}

// Vẽ vùng chồng lấn màu đỏ nhấp nháy trên SVG để nhìn thấy ngay bằng mắt
for (const ov of overlaps) {
  svgElements.push(`<!-- Overlap: ${ov.a} vs ${ov.b} (${ov.area}m2) -->`);
}

const ox = toSvgX(0);
const oy = toSvgY(0);
svgElements.push(`<circle cx="${ox}" cy="${oy}" r="6" fill="#f43f5e" stroke="#ffffff" stroke-width="2" />`);
svgElements.push(`<line x1="${ox}" y1="${oy}" x2="${ox + 45}" y2="${oy}" stroke="#ef4444" stroke-width="2.5" />`);
svgElements.push(`<text x="${ox + 50}" y="${oy + 4}" fill="#ef4444" font-size="11" font-weight="bold">+X</text>`);
svgElements.push(`<line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy - 45}" stroke="#38bdf8" stroke-width="2.5" />`);
svgElements.push(`<text x="${ox - 8}" y="${oy - 52}" fill="#38bdf8" font-size="11" font-weight="bold">-Z (Vào trường)</text>`);

svgElements.push(`</svg>`);

const svgPath = path.join(projectRoot, 'layout-preview.svg');
fs.writeFileSync(svgPath, svgElements.join('\n'), 'utf8');

console.log(fs.readFileSync(overlapsTxtPath, 'utf8'));
