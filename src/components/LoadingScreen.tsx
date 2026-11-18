import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useTourStore } from '../store/useTourStore';

/**
 * Màn hình Loading đã được khắc phục lỗi kẹt 0% (Deadlock):
 * - Trong dự án Procedural (khi chưa nạp file .glb từ mạng), `THREE.DefaultLoadingManager` có `total === 0`
 *   nên `useProgress()` của drei luôn trả về `active = false, progress = 0` khiến điều kiện cũ `progress === 100` bị kẹt vĩnh viễn!
 * - Giải pháp: Kết hợp tiến trình thực của `useProgress` (nếu `total > 0`) với tín hiệu `sceneReady` (bắn ra ngay khi Rapier Physics
 *   và Canvas 3D đã render frame đầu tiên), cộng thêm cơ chế Fallback an toàn sau 1.2 giây để không bao giờ kẹt màn hình chờ.
 */
export function LoadingScreen() {
  const { active, progress, total, item } = useProgress();
  const sceneReady = useTourStore((s) => s.sceneReady);
  const [hidden, setHidden] = useState(false);
  const [fallbackReady, setFallbackReady] = useState(false);

  // Cơ chế bảo hiểm: nếu không có asset ngoài nào đang tải, tự động cho phép vào cảnh sau 3s
  // (tăng từ 1.2s lên 3s để đủ thời gian cho Rapier WASM tải trên mạng chậm)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFallbackReady(true);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  // Nếu sceneReady = true (scene đã mount), hoặc fallbackReady = true (đã quá 3s),
  // VÀ không còn asset nào đang tải (hoặc total=0 nghĩa là procedural scene không có asset ngoài)
  // thì coi như đã tải xong. Thêm điều kiện fallbackReady riêng để tránh kẹt khi
  // useProgress.active vẫn true (do WASM loader không tích hợp DefaultLoadingManager).
  const isAllLoaded =
    (sceneReady && (!active || total === 0)) ||
    (fallbackReady && (total === 0 || progress >= 100 || !active));

  useEffect(() => {
    if (!isAllLoaded) return;
    const hideTimer = window.setTimeout(() => {
      setHidden(true);
    }, 280);
    return () => window.clearTimeout(hideTimer);
  }, [isAllLoaded]);

  if (hidden) return null;

  const displayProgress = isAllLoaded
    ? 100
    : total > 0
      ? Math.min(99, Math.round(progress))
      : sceneReady
        ? 95
        : 65;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 px-6 text-white transition-opacity duration-300 ${
        isAllLoaded ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight text-sky-400">
          VMU Campus Tour 3D
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Đại học Hàng Hải Việt Nam (484 Lạch Tray) — Đang khởi tạo không gian...
        </p>

        <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{ width: `${displayProgress}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span className="max-w-[220px] truncate">
            {item || (isAllLoaded ? 'Hoàn tất khởi tạo!' : 'Đang nạp vật lý Rapier & Cảnh 3D...')}
          </span>
          <span>{displayProgress}%</span>
        </div>
      </div>
    </div>
  );
}
