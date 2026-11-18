/**
 * Bảng màu tập trung (chuẩn sRGB), cấu hình thời gian trong ngày ('day' | 'sunset')
 * và các hằng số tinh chỉnh hiển thị của VMU Campus Tour (Lô 1).
 */
export type TimeOfDay = 'day' | 'sunset';

/** Mặc định là 'day' (ban ngày trời xanh trong, nắng ấm dịu như ảnh gốc) */
export const DEFAULT_TIME_OF_DAY: TimeOfDay = 'day';

export const CAMPUS_METRICS = {
  WIDTH: 320,
  DEPTH: 280,
  GATE_NORM_U: 0.71,
  MIN_X: -228,
  MAX_X: 92,
  MIN_Z: -275,
  MAX_Z: 5,
} as const;

export const CAMPUS_PALETTE = {
  // Bảng màu bầu trời tham chiếu từ ảnh thật
  skyDayZenith: '#5BA4E0',
  skyDayHorizon: '#BFE0F7',
  skyDayFog: '#CFE6F7',

  // Nền đất, sân nhựa xám trung bình (không đen), cỏ xanh tươi hơn
  groundGrass: '#689F4E',
  asphaltMain: '#6E7075',
  asphaltParking: '#64676D',
  sidewalkTile: '#D8DDE3',
  roadLineWhite: '#F2F2EE',
  roadLineYellow: '#EAB308',
  brickPathRed: '#B5522E',
  plazaPinkTile: '#E4BFB0',

  // Công trình kiến trúc (tham chiếu từ 3 ảnh thật)
  wallCream: '#E9E2D0',
  wallWhite: '#F2F2EE',
  wallYellowWarm: '#F3E5AB',
  wallBaseGray: '#7A828C',
  roofTerracotta: '#B5522E',
  roofRedBright: '#C84B31',
  roofMaritimeBlue: '#2B72A8',
  roofDeepBlue: '#1E5688',
  glassCyan: '#4F8FC0',
  glassDark: '#1E3A5F',
  windowFrameLight: '#E6ECF2',

  // Biểu tượng & Điểm nhấn (Vàng kim #D4A72C, Trắng ngà #F2F2EE)
  goldMetallic: '#D4A72C',
  goldDark: '#B8891E',
  ivoryWhite: '#F2F2EE',
  pedestalRed: '#9E332E',
  vmuBrandBlue: '#0F4C81',

  // Hồ nước & Sân bóng
  waterShallow: '#2A9D8F',
  waterDeep: '#1D6F72',
  soccerGrassLight: '#4CAF50',
  soccerGrassDark: '#3B8C40',

  // Cây cối & Cảnh quan (có biến thể sắc độ xanh & hoa phượng đỏ cam)
  treeTrunk: '#6B4F3B',
  palmTrunk: '#826A54',
  palmLeaf: '#4D9132',
  broadCanopy1: '#3B7A47',
  broadCanopy2: '#52945E',
  broadCanopy3: '#2F663B',
  flamboyantCanopyGreen: '#438249',
  flamboyantRed: '#E63946',
  flamboyantOrange: '#F25C3B',
  hedgeGreen: '#316B3C',

  // Cấu hình Hoàng hôn cũ (giữ làm tùy chọn khi timeOfDay === 'sunset')
  sunsetSkyZenith: '#1E3A8A',
  sunsetHorizon: '#FDBA74',
  sunsetSunLight: '#FFEDD5',
  sunsetAmbient: '#FED7AA',
  sunsetGroundBounce: '#7C2D12',
  sunsetFog: '#F3D5B5',
} as const;

export interface LightingPreset {
  sunOffsetFromPlayer: readonly [number, number, number];
  sunColor: string;
  sunIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
  hemiIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  skyTurbidity: number;
  skyRayleigh: number;
  skyMieCoefficient: number;
  skyMieDirectionalG: number;
  toneMappingExposure: number;
  shadowCameraHalfExtent: number;
  shadowBias: number;
  shadowNormalBias: number;
  shadowRadius: number;
}

export const LIGHTING_PRESETS: Record<TimeOfDay, LightingPreset> = {
  /**
   * Chế độ 'day' (Mặc định):
   * - Mặt trời cao ~40 độ (offset [-55, 68, 48]), trời xanh trong (turbidity thấp 2.2, rayleigh 1.1).
   * - Sương mù xanh nhạt (#CFE6F7) khớp chân trời, không trắng lóa.
   * - Hemisphere + Ambient đủ sáng để vùng bóng đạt >= 38–42% độ sáng, không bị đen đặc.
   */
  day: {
    sunOffsetFromPlayer: [-55, 68, 48] as const,
    sunColor: '#FFFDF8',
    sunIntensity: 1.85,
    ambientColor: '#E8F1F8',
    ambientIntensity: 0.78,
    hemiSkyColor: '#BFE0F7',
    hemiGroundColor: '#8B947E',
    hemiIntensity: 0.72,
    fogColor: CAMPUS_PALETTE.skyDayFog,
    fogNear: 120,
    fogFar: 380,
    skyTurbidity: 2.2,
    skyRayleigh: 1.15,
    skyMieCoefficient: 0.003,
    skyMieDirectionalG: 0.75,
    toneMappingExposure: 0.96,
    shadowCameraHalfExtent: 58,
    shadowBias: -0.0004,
    shadowNormalBias: 0.02,
    shadowRadius: 2.5,
  },
  /**
   * Chế độ 'sunset' (Tùy chọn giữ nguyên từ Giai đoạn 2):
   */
  sunset: {
    sunOffsetFromPlayer: [-65, 58, -45] as const,
    sunColor: CAMPUS_PALETTE.sunsetSunLight,
    sunIntensity: 2.1,
    ambientColor: CAMPUS_PALETTE.sunsetAmbient,
    ambientIntensity: 0.68,
    hemiSkyColor: CAMPUS_PALETTE.sunsetHorizon,
    hemiGroundColor: CAMPUS_PALETTE.sunsetGroundBounce,
    hemiIntensity: 0.6,
    fogColor: CAMPUS_PALETTE.sunsetFog,
    fogNear: 85,
    fogFar: 340,
    skyTurbidity: 8.5,
    skyRayleigh: 2.4,
    skyMieCoefficient: 0.005,
    skyMieDirectionalG: 0.82,
    toneMappingExposure: 1.02,
    shadowCameraHalfExtent: 58,
    shadowBias: -0.0005,
    shadowNormalBias: 0.02,
    shadowRadius: 2.5,
  },
};

export const HOTSPOT_LABEL_CONFIG = {
  minDist: 5,        // Khoảng cách bắt đầu hiện rõ (m)
  fadeNearStart: 2.5,// Quá gần (< 5m) thì mờ dần
  maxClearDist: 60,  // Từ 10..60m giữ kích thước hiển thị đồng đều
  fadeFarEnd: 82,    // > 70m mờ dần đến 82m
  baseScaleFactor: 0.048,
  minWorldScale: 0.55,
  maxWorldScale: 2.6,
} as const;
