import React, { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import AppHeader from "./components/AppHeader";
import LongTaskModal from "./components/LongTaskModal";
import LongTaskDetail from "./components/LongTaskDetail";
import {
  CalendarDays,
  Sprout,
  ChevronRight,
  ChevronDown,
  Plus,
} from "lucide-react";

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

function parseDate(dateText) {
  const [y, m, d] = dateText.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function buildDailyPlansForTask(task, oldDailyPlans = []) {
  const oldMap = new Map(oldDailyPlans.map((plan) => [plan.date, plan]));
  const rows = [];

  for (
    let d = parseDate(task.start);
    d <= parseDate(task.end);
    d.setDate(d.getDate() + 1)
  ) {
    const key = dateKey(d);
    const old = oldMap.get(key);

    rows.push({
      id: old?.id ?? `${task.id}-${key}`,
      date: key,
      title: old?.title ?? "",
      completed: old?.completed ?? false,
      estimatedMinutes: old?.estimatedMinutes ?? "",
      actualMinutes: old?.actualMinutes ?? null,
      memo: old?.memo ?? "",
    });
  }

  return rows;
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

  const startIndex = weekDays.findIndex(
    (d) => dateKey(d) === dateKey(visibleStart)
  );
  const endIndex = weekDays.findIndex(
    (d) => dateKey(d) === dateKey(visibleEnd)
  );

  if (startIndex < 0 || endIndex < 0) return null;

  return { gridColumn: `${startIndex + 1} / ${endIndex + 2}` };
}

function countByStatus(tasks, status) {
  return tasks.filter((task) => task.status === status).length;
}

function Header({ currentDate, onPrevMonth, onNextMonth }) {
  return (
    <div className="shrink-0 px-[max(10px,env(safe-area-inset-left))] pt-[calc(6px+env(safe-area-inset-top))]">
      <AppHeader
        title={`${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`}
        onPrev={onPrevMonth}
        onNext={onNextMonth}
      />
    </div>
  );
}

function MonthTabs({ viewMode, setViewMode }) {
  return (
    <div className="mx-3 mt-1.5 grid shrink-0 grid-cols-2 rounded-[15px] border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={() => setViewMode("month")}
        className={`flex h-9 items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-black ${
          viewMode === "month"
            ? "bg-emerald-50 text-emerald-600"
            : "text-slate-400"
        }`}
      >
        <CalendarDays className="h-4 w-4" />
        月間
      </button>

      <button
        type="button"
        onClick={() => setViewMode("week")}
        className={`flex h-9 items-center justify-center gap-1.5 rounded-[12px] text-[13px] font-black ${
          viewMode === "week"
            ? "bg-emerald-50 text-emerald-600"
            : "text-slate-400"
        }`}
      >
        <CalendarDays className="h-4 w-4" />
        週間
      </button>
    </div>
  );
}

function CategoryLegend({ tasks }) {
  const usedCategories = categories.filter((category) =>
    tasks.some((task) => task.category === category.name)
  );

  if (usedCategories.length === 0) return null;

  return (
    <div className="mx-3 mt-1.5 flex shrink-0 items-center justify-between px-1">
      {usedCategories.map((category) => (
        <div key={category.name} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${category.color}`} />
          <span className="text-[10px] font-black text-slate-600">
            {category.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function MonthPager({
  currentDate,
  setCurrentDate,
  selectedDate,
  setSelectedDate,
  longTasks,
  onOpenLongTask,
}) {
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

  requestAnimationFrame(() => {
    el.scrollLeft = el.clientWidth;
  });
}, [currentDate]);

  const handleScrollEnd = () => {
    const el = scrollRef.current;
    if (!el) return;

    const index = Math.round(el.scrollLeft / el.clientWidth);

    if (index === 0) {
      setCurrentDate(
        (current) =>
          new Date(current.getFullYear(), current.getMonth() - 1, 1)
      );
    }

    if (index === 2) {
      setCurrentDate(
        (current) =>
          new Date(current.getFullYear(), current.getMonth() + 1, 1)
      );
    }
  };

  return (
    <div
  ref={scrollRef}
  onScrollEnd={handleScrollEnd}
  className="mx-3 mt-2 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-[18px] border border-slate-200 bg-white scrollbar-none touch-pan-x"
>
      {months.map((monthDate) => (
        <div
          key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
          className="min-h-0 w-full shrink-0 snap-start"
        >
          <MonthCalendar
            currentDate={monthDate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            longTasks={longTasks}
            onOpenLongTask={onOpenLongTask}
          />
        </div>
      ))}
    </div>
  );
}

function MonthCalendar({
  currentDate,
  selectedDate,
  setSelectedDate,
  longTasks,
  onOpenLongTask,
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const weeks = Array.from({ length: 6 }, (_, i) =>
    days.slice(i * 7, i * 7 + 7)
  );
  const todayKey = dateKey(new Date());

  const [selectedDayTasks, setSelectedDayTasks] = useState([]);
  const [selectedDayLabel, setSelectedDayLabel] = useState("");

  const openDayTasks = (day) => {
    setSelectedDate(new Date(day));

    const target = new Date(day);
    target.setHours(0, 0, 0, 0);

    const tasksOnDay = longTasks.filter((task) => {
      const start = parseDate(task.start);
      const end = parseDate(task.end);

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      return start <= target && target <= end;
    });

    if (tasksOnDay.length >= 3) {
      setSelectedDayTasks(tasksOnDay);
      setSelectedDayLabel(`${day.getMonth() + 1}月${day.getDate()}日`);
    } else {
      setSelectedDayTasks([]);
      setSelectedDayLabel("");
    }
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white">
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
            data-week-row="true"
            className="relative grid min-h-0 grid-cols-7 border-b border-slate-100 last:border-b-0"
          >
            {weekDays.map((day, dayIndex) => {
              const isCurrentMonth = day.getMonth() === month;
              const isToday = dateKey(day) === todayKey;
              const isSelected =
                selectedDate && dateKey(day) === dateKey(selectedDate);
              const isSaturday = dayIndex === 5;
              const isSunday = dayIndex === 6;

              const target = new Date(day);
              target.setHours(0, 0, 0, 0);

              const taskCountOnDay = longTasks.filter((task) => {
                const start = parseDate(task.start);
                const end = parseDate(task.end);

                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);

                return start <= target && target <= end;
              }).length;

              const hiddenTaskCount = Math.max(0, taskCountOnDay - 3);

              return (
                <button
                  type="button"
                  key={dateKey(day)}
                  onClick={() => openDayTasks(day)}
                  className={`relative z-0 flex min-h-0 items-start border-r border-slate-100 px-0.5 pb-1 pt-0.5 text-left last:border-r-0 ${
                    isSelected ? "bg-emerald-50/70" : ""
                  }`}
                >
                  <div className="relative h-full w-full">
                    <div
                      className={`ml-1 mt-[1px] grid h-6 w-6 place-items-center rounded-full text-[12px] font-black leading-6 ${
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

                    {hiddenTaskCount > 0 && (
                      <div className="absolute right-[-2px] top-0.5 rounded-full bg-yellow-200 px-1 text-[8px] font-black leading-[13px] text-yellow-800">
                        +{hiddenTaskCount}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[28px] z-20 grid auto-rows-[13px] grid-cols-7 gap-y-[1px] px-1">
              {(() => {
                const visibleTasks = longTasks
                  .map((task) => ({
                    task,
                    placement: getTaskPlacement(task, weekDays),
                  }))
                  .filter((item) => item.placement);

                const shownTasks = visibleTasks.slice(0, 3);

                return (
                  <>
                    {shownTasks.map(({ task, placement }, rowIndex) => (
                      <button
                        type="button"
                        key={`${task.id}-${weekIndex}`}
                        onClick={(event) => {
                          event.stopPropagation();

                          const weekRow = event.currentTarget.closest(
                            '[data-week-row="true"]'
                          );
                          const rect = weekRow.getBoundingClientRect();
                          const colWidth = rect.width / 7;

                          const clickedIndex = Math.min(
                            6,
                            Math.max(
                              0,
                              Math.floor((event.clientX - rect.left) / colWidth)
                            )
                          );

                          const targetDay = weekDays[clickedIndex];

                          const target = new Date(targetDay);
                          target.setHours(0, 0, 0, 0);

                          const tasksOnDay = longTasks.filter((item) => {
                            const start = parseDate(item.start);
                            const end = parseDate(item.end);

                            start.setHours(0, 0, 0, 0);
                            end.setHours(0, 0, 0, 0);

                            return start <= target && target <= end;
                          });

                          if (tasksOnDay.length >= 3) {
                            setSelectedDayTasks(tasksOnDay);
                            setSelectedDayLabel(
                              `${targetDay.getMonth() + 1}月${targetDay.getDate()}日`
                            );
                          } else {
                            onOpenLongTask(task);
                          }
                        }}
                        className="pointer-events-auto relative flex h-[13px] items-center"
                        style={{ ...placement, gridRow: `${rowIndex + 1}` }}
                      >
                        <span
                          className={`${task.color} block h-[12px] w-full truncate rounded-r-full px-1.5 text-[7.5px] font-black leading-[12px] text-white shadow-sm`}
                        >
                          {task.title}
                        </span>
                      </button>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      {selectedDayTasks.length > 0 && (
        <div className="absolute inset-x-3 bottom-3 z-30 rounded-3xl border border-slate-100 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[14px] font-black text-slate-950">
              {selectedDayLabel} の長期タスク
            </p>

            <button
              type="button"
              onClick={() => setSelectedDayTasks([])}
              className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[12px] font-black text-slate-500"
            >
              ×
            </button>
          </div>

          <div className="space-y-2">
            {selectedDayTasks.map((task) => (
              <button
                type="button"
                key={task.id}
                onClick={() => {
                  setSelectedDayTasks([]);
                  onOpenLongTask(task);
                }}
                className="flex h-10 w-full items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 text-left active:bg-slate-100"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${task.color}`} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-black text-slate-900">
                  {task.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MonthSummary({
  expanded,
  setExpanded,
  longTasks,
  onAddLongTask,
  currentDate,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);

  const visibleTasks = longTasks.filter((task) => {
    const start = parseDate(task.start);
    const end = parseDate(task.end);

    return end >= monthStart && start <= monthEnd;
  });

  const totalCount = visibleTasks.length;

  const waitingCount = visibleTasks.filter((task) => {
    const start = parseDate(task.start);
    return start > today;
  }).length;

  const activeCount = visibleTasks.filter((task) => {
    const start = parseDate(task.start);
    const end = parseDate(task.end);
    return start <= today && today <= end;
  }).length;

  const urgentCount = visibleTasks.filter((task) => {
    const end = parseDate(task.end);
    const diffDays = Math.ceil((end - today) / 86400000);
    return diffDays >= 0 && diffDays <= 2;
  }).length;

  const completedCount = visibleTasks.filter((task) => {
    const end = parseDate(task.end);
    return end < today;
  }).length;

  return (
    <section className="mx-3 mt-2 shrink-0 rounded-[18px] border border-slate-100 bg-white px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-emerald-500" />
          <p className="text-[14px] font-black text-slate-950">
            今月のサマリー
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600">
            {totalCount === 0 ? "タスクなし" : `長期 ${totalCount}件`}
          </span>

          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center divide-x divide-slate-100">
          <SummaryItem
            label="進行前"
            value={waitingCount ? `${waitingCount}件` : ""}
          />
          <SummaryItem
            label="進行中"
            value={activeCount ? `${activeCount}件` : ""}
          />
          <SummaryItem
            label="残り3日"
            value={urgentCount ? `${urgentCount}件` : ""}
          />
          <SummaryItem
            label="完了"
            value={completedCount ? `${completedCount}件` : ""}
          />

          <button
            type="button"
            onClick={onAddLongTask}
            className="ml-3 flex min-w-[58px] flex-col items-center justify-center gap-1 text-emerald-600 active:scale-[0.98]"
          >
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
        <p className="mt-1 text-[18px] font-black tracking-[-0.04em] text-slate-950">
          {value}
        </p>
      )}
    </div>
  );
}

export default function CalendarPage({ onNavigate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const LONG_TASKS_STORAGE_KEY = "todo-app-long-tasks-v1";

  const [longTasks, setLongTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(LONG_TASKS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialLongTasks;
    } catch {
      return initialLongTasks;
    }
  });

  const [isLongTaskModalOpen, setIsLongTaskModalOpen] = useState(false);
  const [selectedLongTaskId, setSelectedLongTaskId] = useState(null);
  const [editingLongTask, setEditingLongTask] = useState(null);

  const selectedLongTask = useMemo(() => {
    if (!selectedLongTaskId) return null;
    return longTasks.find((task) => task.id === selectedLongTaskId) ?? null;
  }, [longTasks, selectedLongTaskId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        LONG_TASKS_STORAGE_KEY,
        JSON.stringify(longTasks)
      );
    } catch (error) {
      console.error("長期タスクの保存に失敗しました", error);
    }
  }, [longTasks]);

  const moveMonth = (diff) => {
    setCurrentDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + diff, 1)
    );
  };

  const saveLongTask = (task) => {
    let savedTask = task;

    setLongTasks((current) => {
      const oldTask = current.find((item) => item.id === task.id);

      const dailyPlans = buildDailyPlansForTask(
        task,
        oldTask?.dailyPlans ?? task.dailyPlans ?? []
      );

      savedTask = {
        ...task,
        dailyPlans,
      };

      const exists = current.some((item) => item.id === task.id);

      if (exists) {
        return current.map((item) =>
          item.id === task.id ? savedTask : item
        );
      }

      return [...current, savedTask];
    });

    setCurrentDate(new Date(savedTask.start));
    setSelectedDate(new Date(savedTask.start));

    setEditingLongTask(null);
    setIsLongTaskModalOpen(false);

    setSelectedLongTaskId(savedTask.id);
  };

  const openLongTaskDetail = (task) => {
    setSelectedLongTaskId(task.id);
  };

  const closeLongTaskDetail = () => {
    setSelectedLongTaskId(null);
  };

  const deleteLongTask = (task) => {
    setLongTasks((current) => current.filter((item) => item.id !== task.id));
    setSelectedLongTaskId(null);
  };

  const updateDailyPlan = (task, updatedRow, nextRows) => {
    setLongTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              dailyPlans: nextRows,
            }
          : item
      )
    );

    setSelectedLongTaskId(task.id);
  };

  const updateLongTask = (updatedTask) => {
    setLongTasks((current) =>
      current.map((item) =>
        item.id === updatedTask.id
          ? {
              ...item,
              ...updatedTask,
            }
          : item
      )
    );

    setSelectedLongTaskId(updatedTask.id);
  };

  const openEditLongTask = (task) => {
    const latestTask = longTasks.find((item) => item.id === task.id) ?? task;

    setEditingLongTask(latestTask);
    setIsLongTaskModalOpen(true);
  };

  return (
    <div className="h-dvh overflow-hidden bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#fbfcfb] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <Header
          currentDate={currentDate}
          onPrevMonth={() => moveMonth(-1)}
          onNextMonth={() => moveMonth(1)}
        />

        <main className="flex min-h-0 flex-1 flex-col pb-[calc(82px+env(safe-area-inset-bottom))]">
          <MonthTabs viewMode={viewMode} setViewMode={setViewMode} />

          <MonthPager
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            longTasks={longTasks}
            onOpenLongTask={openLongTaskDetail}
          />

          <CategoryLegend tasks={longTasks} />

          <MonthSummary
            expanded={summaryExpanded}
            setExpanded={setSummaryExpanded}
            longTasks={longTasks}
            currentDate={currentDate}
            onAddLongTask={() => {
              setEditingLongTask(null);
              setIsLongTaskModalOpen(true);
            }}
          />
        </main>
      </div>

      <BottomNav active="calendar" onNavigate={onNavigate} />

      {selectedLongTask && (
        <LongTaskDetail
          task={selectedLongTask}
          onClose={closeLongTaskDetail}
          onEdit={openEditLongTask}
          onDelete={deleteLongTask}
          onUpdateDailyPlan={updateDailyPlan}
          onUpdateTask={updateLongTask}
          onAddTodayPlan={(task) => {
            console.log("add today plan", task);
          }}
        />
      )}

      <LongTaskModal
        open={isLongTaskModalOpen}
        editingTask={editingLongTask}
        onClose={() => setIsLongTaskModalOpen(false)}
        onSave={saveLongTask}
      />
    </div>
  );
}