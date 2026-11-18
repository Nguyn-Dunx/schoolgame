export type Vec3Tuple = [number, number, number];
export type Vec2Tuple = [number, number];

export type RoofStyle = 'hip' | 'gable' | 'flat' | 'dome' | 'courtyard-hip' | 'arched-roof';
export type WindowStyle = 'horizontal-strip' | 'grid' | 'curtain-glass' | 'mixed-a1';

export interface BuildingSpec {
  id: string;
  name: string;
  description: string;
  normPos: Vec2Tuple;
  position: Vec3Tuple;
  rotationY?: number;
  footprint: Vec2Tuple;
  floors: number;
  floorHeight: number;
  roofStyle: RoofStyle;
  roofHeight?: number;
  wallColor: string;
  roofColor: string;
  baseColor?: string;
  windowStyle: WindowStyle;
  hasPortico?: boolean;
  porticoOffsetX?: number;
  hasBalconies?: boolean;
  hasSideGlassWing?: boolean;
  hasDomeTower?: boolean;
  domeOffset?: Vec2Tuple;
  roofSignText?: string;
  modelPath?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface LandmarkSpec {
  id: string;
  type: 'arch-gate' | 'monument-banh-lai' | 'star-plaza' | 'soccer-field' | 'campus-lake';
  name: string;
  normPos: Vec2Tuple;
  position: Vec3Tuple;
  size: Vec3Tuple;
  rotationY?: number;
  /** Góc xoay mặt chính diện tính bằng độ (degrees). Mặc định 0 = hướng về phía Nam (+Z, phía sân lễ / cổng chính) */
  facingDeg?: number;
}

export interface CampusLayoutData {
  campusSize: {
    width: number;
    depth: number;
    originDescription: string;
  };
  landmarks: LandmarkSpec[];
  buildings: BuildingSpec[];
}
