import { CuboidCollider } from '@react-three/rapier';
import type { HotspotData, Vec3Tuple } from '../types/hotspot';
import { useTourStore } from '../store/useTourStore';

interface HotspotSensorProps {
  hotspot: HotspotData;
  /** Kích thước fallback [width, height, depth] nếu trong hotspots.json không khai báo sensorSize */
  defaultSize?: Vec3Tuple;
  /** Độ lệch tâm của vùng cảm biến so với gốc của RigidBody cha */
  offset?: Vec3Tuple;
}

/**
 * Component cảm biến Hotspot dùng chung cho cả các tòa nhà (ProceduralBuilding) và quảng trường (StarPlaza).
 * Tự động đọc `hotspot.sensorSize` từ `hotspots.json` và kích hoạt `setNearbyHotspot` khi người chơi bước vào/ra.
 */
export function HotspotSensor({
  hotspot,
  defaultSize = [20, 10, 20],
  offset,
}: HotspotSensorProps) {
  const setNearbyHotspot = useTourStore((s) => s.setNearbyHotspot);
  const [sx, sy, sz] = hotspot.sensorSize ?? hotspot.size ?? defaultSize;
  const pos: Vec3Tuple = offset ?? [0, sy / 2, 0];

  return (
    <CuboidCollider
      args={[sx / 2, sy / 2, sz / 2]}
      position={pos}
      sensor
      onIntersectionEnter={() => setNearbyHotspot(hotspot)}
      onIntersectionExit={() => setNearbyHotspot(null)}
    />
  );
}
