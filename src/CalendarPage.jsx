import React, { useMemo, useState } from "react";
import BottomNav from "./components/BottomNav";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Home,
  List,
  Menu,
  Plus,
  Settings,
  BarChart3,
  Sprout,
  Clock3,
  PlayCircle,
} from "lucide-react";

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
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 px-5 pb-4 pt-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <button className="grid h-11 w-11 place-items-center rounded-2xl active:bg-slate-100">
          <Menu className="h-8 w-8 text-slate-950" />
        </button>

        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-slate-950" />
          <h1 className="text-[24px] font-black tracking-[-0.04em] text-slate-950">
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
          </h1>
          <ChevronDown className="h-6 w-6 text-slate-950" />
        </div>

        <button className="relative grid h-11 w-11 place-items-center rounded-2xl active:bg-slate-100">
          <Bell className="h-8 w-8 text-slate-950" />
          <span className="absolute right-2 top-1.5 h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}

function NoticeCard() {
  return (
    <section className="mx-4 mt-4 rounded-[24px] bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-4">
          <Sprout className="mt-1 h-8 w-8 shrink-0 text-emerald-500" />
          <div>
            <p className="text-[18px] font-black tracking-[-0.03em] text-slate-950">
              長期タスクのみ表示しています
            </p>
            <p className="mt-1 text-sm font-bold text-slate-600">
              日をまたいで進行するタスクの期間を確認できます
            </p>
          </div>
        </div>

        <button className="hidden shrink-0 items-center gap-2 rounded-[18px] border border-emerald-100 bg-white px-4 py-3 text-sm font-black text-emerald-600 shadow-sm min-[360px]:flex">
          <List className="h-5 w-5" />
          長期タスク一覧
        </button>
      </div>
    </section>
  );
}

function MonthTabs() {
  return (
    <div className="mx-4 mt-5 grid grid-cols-2 rounded-[20px] border border-slate-200 bg-white p-1">
      <button className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-emerald-50 text-[16px] font-black text-emerald-600">
        <CalendarDays className="h-6 w-6" />
        月間
      </button>
      <button className="flex h-12 items-center justify-center gap-2 rounded-[16px] text-[16px] font-black text-slate-400">
        <CalendarDays className="h-6 w-6" />
        週
      </button>
    </div>
  );
}

function CalendarGrid({ currentDate }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const weeks = Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const todayKey = "2026-03-03";

  return (
    <section className="mx-4 mt-5 overflow-hidden rounded-[20px] border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {["月", "火", "水", "木", "金", "土", "日"].map((day, index) => (
          <div
            key={day}
            className={`py-3 text-center text-sm font-black ${
              index === 5 ? "text-blue-500" : index === 6 ? "text-red-500" : "text-slate-950"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {weeks.map((weekDays, weekIndex) => (
        <div key={weekIndex} className="relative grid min-h-[118px] grid-cols-7 border-b border-slate-100 last:border-b-0">
          {weekDays.map((day, dayIndex) => {
            const isCurrentMonth = day.getMonth() === month;
            const isToday = dateKey(day) === todayKey;
            const isSaturday = dayIndex === 5;
            const isSunday = dayIndex === 6;

            return (
              <div key={dateKey(day)} className="border-r border-slate-100 px-2 py-3 last:border-r-0">
                <div
                  className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-[17px] font-black ${
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

          <div className="pointer-events-none absolute inset-x-0 top-[54px] grid grid-cols-7 gap-y-1 px-1">
            {longTasks.map((task, i) => {
              const placement = getTaskPlacement(task, weekDays);
              if (!placement) return null;

              return (
                <div
                  key={`${task.id}-${weekIndex}`}
                  className={`${task.color} h-7 truncate rounded-r-full px-3 text-[11px] font-black leading-7 text-white shadow-sm`}
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
    </section>
  );
}

function SummaryCard() {
  return (
    <section className="mx-4 mt-5 rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sprout className="h-7 w-7 text-emerald-500" />
          <h2 className="text-[20px] font-black tracking-[-0.04em] text-slate-950">
            今月の長期タスクサマリー
          </h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-600">
          進行中 7件
        </span>
      </div>

      <div className="grid grid-cols-4 divide-x divide-slate-100 text-center">
        <SummaryItem icon={<Clock3 />} label="進行前" value="2件" />
        <SummaryItem icon={<PlayCircle />} label="進行中" value="5件" />
        <SummaryItem icon={<Clock3 />} label="期限3日以内" value="2件" />
        <SummaryItem icon={<CheckCircle2 />} label="完了済み" value="1件" />
      </div>

      <button className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-[18px] border border-emerald-200 bg-white text-[17px] font-black text-emerald-600 active:bg-emerald-50">
        <Plus className="h-6 w-6" />
        長期タスクを追加
      </button>
    </section>
  );
}

function SummaryItem({ icon, label, value }) {
  return (
    <div className="px-1">
      <div className="mx-auto mb-2 grid h-8 w-8 place-items-center text-emerald-500">
        {React.cloneElement(icon, { className: "h-7 w-7", strokeWidth: 2.4 })}
      </div>
      <p className="text-[11px] font-black text-slate-600">{label}</p>
      <p className="mt-2 text-[22px] font-black tracking-[-0.05em] text-slate-950">{value}</p>
    </div>
  );
}


export default function CalendarPage({ onNavigate }) {
  const [currentDate] = useState(new Date(2026, 2, 1));

  return (
    <div className="min-h-dvh bg-[#fbfcfb] text-slate-950 antialiased">
      <div className="mx-auto min-h-dvh w-full max-w-[390px] bg-[#fbfcfb] pb-24">
        <Header currentDate={currentDate} />
        <NoticeCard />
        <MonthTabs />
        <CalendarGrid currentDate={currentDate} />
        <SummaryCard />
        <div className="h-5" />
        <BottomNav active="calendar" onNavigate={onNavigate} />
      </div>
    </div>
  );
}