import React, { useMemo, useState } from "react";
import BottomNav from "./components/BottomNav";
import AppHeader from "./components/AppHeader";
import { CalendarDays, Sprout } from "lucide-react";

const longTasks = [
  { id: 1, title: "プロダクト開発計画", start: "2026-03-02", end: "2026-03-04", color: "bg-slate-500" },
  { id: 2, title: "キャンペーン企画立案", start: "2026-03-05", end: "2026-03-08", color: "bg-pink-500" },
  { id: 3, title: "資格取得の学習", start: "2026-03-09", end: "2026-03-11", color: "bg-blue-500" },
  { id: 4, title: "運動習慣づくり", start: "2026-03-12", end: "2026-03-15", color: "bg-emerald-500" },
  { id: 5, title: "旅行計画の準備", start: "2026-03-16", end: "2026-03-22", color: "bg-pink-500" },
  { id: 6, title: "英語スキル向上プロジェクト", start: "2026-03-16", end: "2026-03-19", color: "bg-orange-400" },
  { id: 7, title: "読書習慣をつくる", start: "2026-03-18", end: "2026-03-22", color: "bg-blue-500" },
  { id: 8, title: "家計見直しプロジェクト", start: "2026-03-23", end: "2026-03-29", color: "bg-emerald-500" },
  { id: 9, title: "ポートフォリオ制作", start: "2026-03-30", end: "2026-03-31", color: "bg-violet-500" },
];

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildCalendarDays(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const start = new Date(firstDay);
  const day = firstDay.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  start.setDate(firstDay.getDate() + mondayOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getTaskPlacement(task, weekDays) {
  const start = new Date(task.start);
  const end = new Date(task.end);

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  if (end < weekStart || start > weekEnd) return null;

  const visibleStart = start < weekStart ? weekStart : start;
  const visibleEnd = end > weekEnd ? weekEnd : end;

  const startIndex = weekDays.findIndex((d) => dateKey(d) === dateKey(visibleStart));
  const endIndex = weekDays.findIndex((d) => dateKey(d) === dateKey(visibleEnd));

  if (startIndex < 0 || endIndex < 0) return null;

  return {
    gridColumn: `${startIndex + 1} / ${endIndex + 2}`,
  };
}

function Header({ currentDate }) {
  return (
    <div className="shrink-0 px-[max(10px,env(safe-area-inset-left))] pt-[calc(6px+env(safe-area-inset-top))]">
      <AppHeader
        title={`${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`}
        centerIcon={<CalendarDays className="h-5 w-5 text-slate-950" />}
      />
    </div>
  );
}

function NoticeCard() {
  return (
    <section className="mx-3 mt-2 shrink-0 rounded-[16px] border border-emerald-100 bg-emerald-50/70 px-3 py-2">
      <p className="text-[11px] font-bold text-emerald-700">
        長期タスクを表示中
      </p>
    </section>
  );
}

function MonthTabs() {
  return (
    <div className="mx-3 mt-2 grid shrink-0 grid-cols-2 rounded-[15px] border border-slate-200 bg-white p-1">
      <button className="flex h-9 items-center justify-center gap-1.5 rounded-[12px] bg-emerald-50 text-[13px] font-black text-emerald-600">
        <CalendarDays className="h-4 w-4" />
        月間
      </button>

      <button className="flex h-9 items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-black text-slate-400">
        <CalendarDays className="h-4 w-4" />
        週
      </button>
    </div>
  );
}

function CalendarGrid({ currentDate }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = useMemo(
    () => buildCalendarDays(year, month),
    [year, month]
  );

  const weeks = Array.from(
    { length: 6 },
    (_, i) => days.slice(i * 7, i * 7 + 7)
  );

  const todayKey = "2026-03-03";

  return (
    <section className="mx-3 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white">
      <div className="grid h-8 shrink-0 grid-cols-7 border-b border-slate-200">
        {["月", "火", "水", "木", "金", "土", "日"].map((day, index) => (
          <div
            key={day}
            className={`grid place-items-center text-[12px] font-black ${
              index === 5
                ? "text-blue-500"
                : index === 6
                ? "text-red-500"
                : "text-slate-950"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-6">
        {weeks.map((weekDays, weekIndex) => (
          <div
            key={weekIndex}
            className="relative grid min-h-0 grid-cols-7 border-b border-slate-100 last:border-b-0"
          >
            {weekDays.map((day, dayIndex) => {
              const isCurrentMonth = day.getMonth() === month;
              const isToday = dateKey(day) === todayKey;
              const isSaturday = dayIndex === 5;
              const isSunday = dayIndex === 6;

              return (
                <div
                  key={dateKey(day)}
                  className="min-h-0 border-r border-slate-100 px-0.5 py-1 last:border-r-0"
                >
                  <div
                    className={`mx-auto grid h-6 w-6 place-items-center rounded-full text-[12px] font-black ${
                      isToday
                        ? "bg-emerald-500 text-white"
                        : !isCurrentMonth
                        ? "text-slate-300"
                        : isSaturday
                        ? "text-blue-500"
                        : isSunday
                        ? "text-red-500"
                        : "text-slate-950"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}

            <div className="pointer-events-none absolute inset-x-0 top-[30px] grid grid-cols-7 gap-y-0.5 px-1">
              {longTasks.map((task, i) => {
                const placement = getTaskPlacement(task, weekDays);

                if (!placement) return null;

                return (
                  <div
                    key={`${task.id}-${weekIndex}`}
                    className={`${task.color} h-[17px] truncate rounded-r-full px-1.5 text-[8.5px] font-black leading-[17px] text-white shadow-sm`}
                    style={{
                      ...placement,
                      gridRow: `${(i % 3) + 1}`,
                    }}
                  >
                    {task.title}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompactSummary() {
  return (
    <section className="mx-3 mt-2 shrink-0 rounded-[16px] border border-slate-100 bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-emerald-500" />
          <p className="text-[13px] font-black text-slate-950">
            今月の長期タスク
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-black">
          <span className="text-slate-400">進行前 2</span>
          <span className="text-emerald-600">進行中 5</span>
          <span className="text-blue-500">完了 1</span>
        </div>
      </div>
    </section>
  );
}

export default function CalendarPage({ onNavigate }) {
  const [currentDate] = useState(new Date(2026, 2, 1));

  return (
    <div className="h-dvh overflow-hidden bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#fbfcfb] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <Header currentDate={currentDate} />

        <main className="flex min-h-0 flex-1 flex-col pb-[calc(82px+env(safe-area-inset-bottom))]">
          <NoticeCard />
          <MonthTabs />
          <CalendarGrid currentDate={currentDate} />
          <CompactSummary />
        </main>
      </div>

      <BottomNav
        active="calendar"
        onNavigate={onNavigate}
      />
    </div>
  );
}