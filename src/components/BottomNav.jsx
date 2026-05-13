import { Home, CalendarDays, BarChart3, Settings } from "lucide-react";

export default function BottomNav({ active = "today", onNavigate }) {
  const items = [
    { key: "today", label: "今日", icon: Home },
    { key: "calendar", label: "カレンダー", icon: CalendarDays },
    { key: "stats", label: "統計", icon: BarChart3 },
    { key: "settings", label: "設定", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-[calc(10px+env(safe-area-inset-bottom))] left-1/2 z-40 grid h-[66px] w-[calc(100%-20px)] max-w-[390px] -translate-x-1/2 grid-cols-4 overflow-hidden rounded-[22px] border border-slate-100 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;

        return (
          <button
            key={item.key}
            onClick={() => onNavigate?.(item.key)}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-black ${
              isActive ? "bg-emerald-50 text-emerald-500" : "text-slate-500"
            }`}
          >
            <Icon
              className={`h-6 w-6 ${isActive ? "fill-emerald-500" : ""}`}
              strokeWidth={2.15}
            />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}