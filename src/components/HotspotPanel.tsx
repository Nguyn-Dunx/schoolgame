import { useMemo } from 'react';
import { useTourStore } from '../store/useTourStore';

export function HotspotPanel() {
  const activeHotspot = useTourStore((s) => s.activeHotspot);
  const closePanel = useTourStore((s) => s.closePanel);

  // Chỉ hiển thị badge kỹ thuật TODO_VERIFY khi URL có ?debug=1
  const isDebugMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === '1';
  }, []);

  if (!activeHotspot) return null;

  return (
    <aside className="fixed right-4 top-4 bottom-4 z-30 w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900/92 p-5 text-slate-100 shadow-2xl backdrop-blur-md transition-all">
      <div className="flex items-start justify-between gap-3 border-b border-slate-700/80 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-medium text-sky-300">
              Điểm tham quan VMU
            </span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                activeHotspot.status === 'verified'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {activeHotspot.status === 'verified' ? 'Đã xác thực' : 'Bản nháp tư liệu'}
            </span>
            {isDebugMode && activeHotspot.TODO_VERIFY && (
              <span className="inline-block rounded-full bg-rose-500/25 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-300">
                TODO_VERIFY
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-xl font-bold text-white">
            {activeHotspot.name}
          </h2>
        </div>

        <button
          onClick={closePanel}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
          aria-label="Đóng bảng thông tin"
        >
          Đóng ✕
        </button>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-200">
        {activeHotspot.description}
      </p>

      {activeHotspot.images.length > 0 && (
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Hình ảnh tư liệu
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {activeHotspot.images.map((imgUrl, idx) => (
              <figure key={idx} className="overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/10">
                <img
                  src={imgUrl}
                  alt={`${activeHotspot.name} - ảnh ${idx + 1}`}
                  loading="lazy"
                  className="h-48 w-full object-cover"
                />
                {activeHotspot.credit && (
                  <figcaption className="border-t border-white/5 px-3 py-1.5 text-[11px] text-slate-400">
                    Nguồn: {activeHotspot.credit}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-xl bg-slate-800/70 p-3 text-xs text-slate-400">
        Tọa độ khuôn viên (m): [{activeHotspot.position.join(', ')}]
      </div>
    </aside>
  );
}
