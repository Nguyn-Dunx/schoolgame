export type Vec3Tuple = [number, number, number];

export type HotspotStatus = 'draft' | 'verified';

export interface HotspotData {
  id: string;
  name: string;
  description: string;
  position: Vec3Tuple;
  size?: Vec3Tuple;
  sensorSize?: Vec3Tuple; // Kích thước hộp cảm biến [width, height, depth] (m)
  color?: string;
  modelPath?: string;
  images: string[];
  credit: string;         // Nguồn / tác giả hình ảnh tư liệu
  status: HotspotStatus;  // 'draft' | 'verified'
  TODO_VERIFY?: boolean;
}
