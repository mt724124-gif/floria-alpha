import React, { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import AppHeader from "./components/AppHeader";
import LongTaskModal from "./components/LongTaskModal";
import { CalendarDays, Sprout, ChevronRight, ChevronDown, Plus } from "lucide-react";

const initialLongTasks = [];

const categories = [
  { name: "研究", color: "bg-emerald-500" },
  { name: "仕事", color: "bg-blue-500" },
  { name: "学習", color: "bg-pink-500" },
  { name: "生活", color: "bg-orange-500" },
  { name: "その他", color: "bg-violet-500" },
];

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  return { gridColumn: `${startIndex + 1} / ${endIndex + 2}` };
}

function countByStatus(tasks, status) {
  return tasks.filter((task) => task.status === status).length;
}

function Header({ currentDate, onPrevMonth, onNextMonth }) {
  return (
    <div className="shrink-0 px-[max(10px,env(safe-area-inset-left))] pt-[calc(6px+env(safe-area-inset-top))]">
      <AppHeader title={`${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`} onPrev={onPrevMonth} onNext={onNextMonth} />
    </div>
  );
}

function MonthTabs({ viewMode, setViewMode }) {
  return (
    <div className="mx-3 mt-1.5 grid shrink-0 grid-cols-2 rounded-[15px] border border-slate-200 bg-white p-1">
      <button type="button" onClick={() => setViewMode("month")} className={`flex h-9 items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-black ${viewMode === "month" ? "bg-emerald-50 text-emerald-600" : "text-slate-400"}`}>
        <CalendarDays className="h-4 w-4" />
        月間
      </button>
      <button type="button" onClick={() => setViewMode("week")} className={`flex h-9 items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-black ${viewMode === "week" ? "bg-emerald-50 text-emerald-600" : "text-slate-400"}`}>
        <CalendarDays className="h-4 w-4" />
        週間
      </button>
    </div>
  );
}

function CategoryLegend({ tasks }) {
  const usedCategories = categories.filter((category) => tasks.some((task) => task.category === category.name));
  if (usedCategories.length === 0) return null;

  return (
    <div className="mx-3 mt-1.5 flex shrink-0 items-center justify-between px-1">
      {usedCategories.map((category) => (
        <div key={category.name} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${category.color}`} />
          <span className="text-[10px] font-black text-slate-600">{category.name}</span>
        </div>
      ))}
    </div>
  );
}

function MonthPager({ currentDate, setCurrentDate, selectedDate, setSelectedDate, longTasks }) {
  const scrollRef = useRef(null);
  const isResettingRef = useRef(false);

  const months = useMemo(() => {
    return [
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    ];
  }, [currentDate]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    isResettingRef.current = true;
    el.scrollLeft = el.clientWidth;
    requestAnimationFrame(() => {
      isResettingRef.current = false;
    });
  }, [currentDate]);

  const handleScrollEnd = () => {
    const el = scrollRef.current;
    if (!el || isResettingRef.current) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index === 0) setCurrentDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
    if (index === 2) setCurrentDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  return (
    <div ref={scrollRef} onScrollEnd={handleScrollEnd} className="mx-3 mt-2 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth rounded-[18px] border border-slate-200 bg-white scrollbar-none">
      {months.map((monthDate) => (
        <div key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`} className="min-h-0 w-full shrink-0 snap-center">
          <MonthCalendar currentDate={monthDate} selectedDate={selectedDate} setSelectedDate={setSelectedDate} longTasks={longTasks} />
        </div>
      ))}
    </div>
  );
}

function MonthCalendar({ currentDate, selectedDate, setSelectedDate, longTasks }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const weeks = Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const todayKey = dateKey(new Date());

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="grid h-8 shrink-0 grid-cols-7 border-b border-slate-200">
        {["月", "火", "水", "木", "金", "土", "日"].map((day, index) => (
          <div key={day} className={`grid place-items-center text-[12px] font-black ${index === 5 ? "text-blue-500" : index === 6 ? "text-red-500" : "text-slate-950"}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-6">
        {weeks.map((weekDays, weekIndex) => (
          <div key={weekIndex} className="relative grid min-h-0 grid-cols-7 border-b border-slate-100 last:border-b-0">
            {weekDays.map((day, dayIndex) => {
              const isCurrentMonth = day.getMonth() === month;
              const isToday = dateKey(day) === todayKey;
              const isSelected = selectedDate && dateKey(day) === dateKey(selectedDate);
              const isSaturday = dayIndex === 5;
              const isSunday = dayIndex === 6;

              return (
                <button type="button" key={dateKey(day)} onClick={() => setSelectedDate(new Date(day))} className={`flex min-h-0 items-start border-r border-slate-100 px-0.5 pb-1 pt-0.5 text-left last:border-r-0 ${isSelected ? "bg-emerald-50/70" : ""}`}>
                  <div className={`ml-auto mr-auto mt-[-2px] grid h-6 w-6 place-items-start justify-items-center rounded-full text-[12px] font-black leading-6 ${isToday ? "bg-emerald-500 text-white" : !isCurrentMonth ? "text-slate-300" : isSaturday ? "text-blue-500" : isSunday ? "text-red-500" : "text-slate-950"}`}>
                    {day.getDate()}
                  </div>
                </button>
              );
            })}

            <div className="pointer-events-none absolute inset-x-0 top-[30px] grid grid-cols-7 gap-y-0.5 px-1">
              {longTasks.map((task, i) => {
                const placement = getTaskPlacement(task, weekDays);
                if (!placement) return null;

                return (
                  <button type="button" key={`${task.id}-${weekIndex}`} className="pointer-events-auto relative flex min-h-[20px] items-center" style={{ ...placement, gridRow: `${(i % 3) + 1}` }}>
                    <span className={`${task.color} block h-[16px] w-full truncate rounded-r-full px-1.5 text-[8.5px] font-black leading-[16px] text-white shadow-sm`}>
                      {task.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MonthSummary({ expanded, setExpanded, longTasks, onAddLongTask }) {
  const totalCount = longTasks.length;
  const waitingCount = countByStatus(longTasks, "進行前");
  const activeCount = countByStatus(longTasks, "進行中");
  const urgentCount = countByStatus(longTasks, "期限近");
  const completedCount = countByStatus(longTasks, "完了");

  return (
    <section className="mx-3 mt-2 shrink-0 rounded-[18px] border border-slate-100 bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-emerald-500" />
          <p className="text-[14px] font-black text-slate-950">今月のサマリー</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600">
            {totalCount === 0 ? "タスクなし" : `長期 ${totalCount}件`}
          </span>
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center divide-x divide-slate-100">
          <SummaryItem label="進行前" value={waitingCount ? `${waitingCount}件` : ""} />
          <SummaryItem label="進行中" value={activeCount ? `${activeCount}件` : ""} />
          <SummaryItem label="期限近" value={urgentCount ? `${urgentCount}件` : ""} />
          <SummaryItem label="完了" value={completedCount ? `${completedCount}件` : ""} />
          <button type="button" onClick={onAddLongTask} className="ml-3 flex min-w-[58px] flex-col items-center justify-center gap-1 text-emerald-600 active:scale-[0.98]">
            <Plus className="h-5 w-5" />
            <span className="text-[10px] font-black leading-tight">
              長期タスク
              <br />
              を追加
            </span>
          </button>
        </div>
      )}
    </section>
  );
}

function SummaryItem({ label, value }) {
  const isEmpty = !value || value === "0件";

  return (
    <div className="text-center">
      <p className="text-[10px] font-black text-slate-500">{label}</p>
      {isEmpty ? (
        <div className="mt-3 flex justify-center">
          <div className="h-[2px] w-5 rounded-full bg-slate-200" />
        </div>
      ) : (
        <p className="mt-1 text-[18px] font-black tracking-[-0.04em] text-slate-950">{value}</p>
      )}
    </div>
  );
}

export default function CalendarPage({ onNavigate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [longTasks, setLongTasks] = useState(initialLongTasks);
  const [isLongTaskModalOpen, setIsLongTaskModalOpen] = useState(false);

  const moveMonth = (diff) => {
    setCurrentDate((current) => new Date(current.getFullYear(), current.getMonth() + diff, 1));
  };

  const saveLongTask = (task) => {
    setLongTasks((current) => [...current, task]);
    setCurrentDate(new Date(task.start));
    setSelectedDate(new Date(task.start));
  };

  return (
    <div className="h-dvh overflow-hidden bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#fbfcfb] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <Header currentDate={currentDate} onPrevMonth={() => moveMonth(-1)} onNextMonth={() => moveMonth(1)} />

        <main className="flex min-h-0 flex-1 flex-col pb-[calc(82px+env(safe-area-inset-bottom))]">
          <MonthTabs viewMode={viewMode} setViewMode={setViewMode} />
          <MonthPager currentDate={currentDate} setCurrentDate={setCurrentDate} selectedDate={selectedDate} setSelectedDate={setSelectedDate} longTasks={longTasks} />
          <CategoryLegend tasks={longTasks} />
          <MonthSummary expanded={summaryExpanded} setExpanded={setSummaryExpanded} longTasks={longTasks} onAddLongTask={() => setIsLongTaskModalOpen(true)} />
        </main>
      </div>

      <BottomNav active="calendar" onNavigate={onNavigate} />

      <LongTaskModal open={isLongTaskModalOpen} onClose={() => setIsLongTaskModalOpen(false)} onSave={saveLongTask} />
    </div>
  );
}