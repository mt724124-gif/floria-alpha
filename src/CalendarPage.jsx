import React, { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import LongTaskModal from "./components/LongTaskModal";
import LongTaskDetail from "./components/LongTaskDetail";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  GripVertical,
  Plus,
  Sprout,
  Target,
} from "lucide-react";

const initialLongTasks = [];

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(dateText) {
  if (!dateText || typeof dateText !== "string") return new Date();
  const [y, m, d] = dateText.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, diff) {
  const next = new Date(date);
  next.setDate(next.getDate() + diff);
  return next;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

function formatMinutes(minutes) {
  const value = Number(minutes || 0);
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (value <= 0) return "—";
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function formatMinutesCompact(minutes) {
  const value = Number(minutes || 0);
  if (value <= 0) return "—";
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function getTodoDateKey(todo) {
  return todo?.targetDate ?? todo?.date ?? todo?.createdDate ?? dateKey(new Date());
}

function isCompleted(item) {
  return item?.completed === true || item?.taskStatus === "completed";
}

function normalizeLongTaskShape(task) {
  const start = task.start ?? task.startDate ?? task.start_date ?? "";
  const end = task.end ?? task.endDate ?? task.end_date ?? task.deadline ?? start;

  return {
    ...task,
    start,
    end,
    startDate: start,
    endDate: end,
  };
}

function normalizeLongTaskList(tasks) {
  return (tasks ?? [])
    .map(normalizeLongTaskShape)
    .filter((task) => task.start && task.end);
}

function buildDailyPlansForTask(task, oldDailyPlans = []) {
  const oldMap = new Map((oldDailyPlans ?? []).map((plan) => [plan.date, plan]));
  const rows = [];

  for (let d = parseDate(task.start); d <= parseDate(task.end); d.setDate(d.getDate() + 1)) {
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
      tasks: Array.isArray(old?.tasks) ? old.tasks : [],
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
  const start = parseDate(task.start);
  const end = parseDate(task.end);
  const weekStart = new Date(weekDays[0]);
  const weekEnd = new Date(weekDays[6]);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  weekStart.setHours(0, 0, 0, 0);
  weekEnd.setHours(0, 0, 0, 0);

  if (end < weekStart || start > weekEnd) return null;

  const visibleStart = start < weekStart ? weekStart : start;
  const visibleEnd = end > weekEnd ? weekEnd : end;

  const startIndex = weekDays.findIndex((d) => dateKey(d) === dateKey(visibleStart));
  const endIndex = weekDays.findIndex((d) => dateKey(d) === dateKey(visibleEnd));

  if (startIndex < 0 || endIndex < 0) return null;

  return { gridColumn: `${startIndex + 1} / ${endIndex + 2}` };
}

function getTasksOnDay(tasks, day) {
  const target = new Date(day);
  target.setHours(0, 0, 0, 0);

  return tasks.filter((task) => {
    const start = parseDate(task.start);
    const end = parseDate(task.end);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return start <= target && target <= end;
  });
}

function getLongDailyTasksForDate(longTasks, targetDateKey) {
  return longTasks.flatMap((longTask) => {
    const plan = (longTask.dailyPlans ?? []).find((row) => row.date === targetDateKey);

    if (!plan) return [];

    if (Array.isArray(plan.tasks)) {
      return plan.tasks
        .filter((item) => item?.selected !== false)
        .map((item, index) => ({
          ...item,
          id: item.id ?? `${longTask.id}-${targetDateKey}-${index}`,
          type: "longDaily",
          parentId: longTask.id,
          parentTitle: longTask.title,
          parentColor: longTask.color ?? "bg-emerald-400",
          date: targetDateKey,
          title: item.title || "小タスク名なし",
          estimatedMinutes: item.estimatedMinutes ?? null,
          completed: Boolean(item.completed),
        }));
    }

    if (String(plan.title ?? "").trim()) {
      return [
        {
          ...plan,
          id: plan.id ?? `${longTask.id}-${targetDateKey}`,
          type: "longDaily",
          parentId: longTask.id,
          parentTitle: longTask.title,
          parentColor: longTask.color ?? "bg-emerald-400",
          date: targetDateKey,
          title: plan.title,
          estimatedMinutes: plan.estimatedMinutes ?? null,
          completed: Boolean(plan.completed),
        },
      ];
    }

    return [];
  });
}

function getLongDailyLabels(longTask, targetDateKey) {
  const plan = (longTask.dailyPlans ?? []).find((row) => row.date === targetDateKey);

  if (!plan) return [];

  if (Array.isArray(plan.tasks)) {
    return plan.tasks
      .filter((item) => item?.selected !== false && String(item?.title ?? "").trim())
      .map((item) => ({
        title: item.title,
        completed: Boolean(item.completed),
      }));
  }

  if (String(plan.title ?? "").trim()) {
    return [
      {
        title: plan.title,
        completed: Boolean(plan.completed),
      },
    ];
  }

  return [];
}

function getLongTaskRemainingDays(task, baseDate = new Date()) {
  const end = parseDate(task.end);
  const base = new Date(baseDate);
  end.setHours(0, 0, 0, 0);
  base.setHours(0, 0, 0, 0);
  return Math.ceil((end - base) / 86400000) + 1;
}

function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  return `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}日〜${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
}

function getTodoColor(todo) {
  if (todo?.color) return todo.color;
  if (todo?.category === "学習") return "bg-emerald-500";
  if (todo?.category === "仕事") return "bg-blue-500";
  if (todo?.category === "健康") return "bg-violet-500";
  if (todo?.category === "家事") return "bg-amber-500";
  if (todo?.category === "研究") return "bg-blue-500";
  return "bg-emerald-400";
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
  const usedCategories = Array.from(
    new Map(
      tasks
        .filter((task) => task.category)
        .map((task) => [
          task.category,
          {
            name: task.category,
            color: task.color ?? "bg-slate-400",
          },
        ])
    ).values()
  );

  if (usedCategories.length === 0) return null;

  return (
    <div className="mx-3 mt-1.5 flex shrink-0 items-center gap-4 px-1">
      {usedCategories.map((category) => (
        <div key={category.name} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${category.color}`} />
          <span className="text-[10px] font-black text-slate-600">{category.name}</span>
        </div>
      ))}
    </div>
  );
}

function MonthPager({ currentDate, setCurrentDate, selectedDate, setSelectedDate, longTasks, onOpenLongTask, onReorderLongTasks }) {
  const scrollRef = useRef(null);
  const pendingCenterScrollRef = useRef(true);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [baseMonth, setBaseMonth] = useState(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));

  const months = useMemo(() => {
    return Array.from({ length: 25 }, (_, index) => {
      return new Date(baseMonth.getFullYear(), baseMonth.getMonth() + index - 12, 1);
    });
  }, [baseMonth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pendingCenterScrollRef.current) return;
    requestAnimationFrame(() => {
      el.scrollLeft = el.clientWidth * 12;
      pendingCenterScrollRef.current = false;
    });
  }, [months]);

  const moveToMonth = (target) => {
    const centeredTarget = new Date(target.getFullYear(), target.getMonth(), 1);
    pendingCenterScrollRef.current = true;
    setBaseMonth(centeredTarget);
    setCurrentDate(centeredTarget);
    setMonthPickerOpen(false);
  };

  const handleScrollEnd = () => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    const nextMonth = months[index];
    if (!nextMonth) return;

    if (nextMonth.getFullYear() !== currentDate.getFullYear() || nextMonth.getMonth() !== currentDate.getMonth()) {
      setCurrentDate(nextMonth);
    }
  };

  return (
    <>
      <div ref={scrollRef} onScrollEnd={handleScrollEnd} className="mx-3 mt-2 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-[18px] border border-slate-200 bg-white scrollbar-none touch-pan-x">
        {months.map((monthDate) => (
          <div key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`} className="min-h-0 w-full shrink-0 snap-start snap-always">
            <MonthCalendar currentDate={monthDate} selectedDate={selectedDate} setSelectedDate={setSelectedDate} longTasks={longTasks} onOpenLongTask={onOpenLongTask} onReorderLongTasks={onReorderLongTasks} onCenterMonth={(targetMonth) => { setPickerYear(targetMonth.getFullYear()); setMonthPickerOpen(true); }} onMoveToMonth={moveToMonth} />
          </div>
        ))}
      </div>

      {monthPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6" onClick={() => setMonthPickerOpen(false)}>
          <div className="w-full max-w-[340px] rounded-[24px] bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => setPickerYear((year) => year - 1)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[18px] font-black text-slate-600">‹</button>
              <p className="text-[18px] font-black text-slate-950">{pickerYear}年</p>
              <button type="button" onClick={() => setPickerYear((year) => year + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[18px] font-black text-slate-600">›</button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, index) => {
                const targetMonth = new Date(pickerYear, index, 1);
                const isCurrent = targetMonth.getFullYear() === currentDate.getFullYear() && targetMonth.getMonth() === currentDate.getMonth();

                return (
                  <button type="button" key={index} onClick={() => moveToMonth(targetMonth)} className={`h-11 rounded-2xl text-[14px] font-black ${isCurrent ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-700 active:bg-emerald-50"}`}>
                    {index + 1}月
                  </button>
                );
              })}
            </div>

            <button type="button" onClick={() => setMonthPickerOpen(false)} className="mt-4 h-11 w-full rounded-2xl bg-slate-100 text-[14px] font-black text-slate-600">
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MonthCalendar({ currentDate, selectedDate, setSelectedDate, longTasks, onOpenLongTask, onReorderLongTasks, onCenterMonth, onMoveToMonth }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const weeks = Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const today = new Date();
  const todayKey = dateKey(today);
  const isThisMonth = currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth();

  const [selectedDayTasks, setSelectedDayTasks] = useState([]);
  const [selectedDayLabel, setSelectedDayLabel] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dropTargetTaskId, setDropTargetTaskId] = useState(null);

  const draggingTaskIdRef = useRef(null);
  const dragStartYRef = useRef(0);
  const dragClickBlockRef = useRef(false);
  const dragLastStepRef = useRef(0);
  const previousBodyTouchActionRef = useRef("");
  const previousBodyUserSelectRef = useRef("");

  const beginDayTaskDragging = (event, taskId) => {
    event.preventDefault();
    event.stopPropagation();
    draggingTaskIdRef.current = taskId;
    dragStartYRef.current = event.clientY;
    dragClickBlockRef.current = false;
    dragLastStepRef.current = 0;
    previousBodyTouchActionRef.current = document.body.style.touchAction;
    previousBodyUserSelectRef.current = document.body.style.userSelect;
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
    setDraggingTaskId(taskId);
    setDragOffsetY(0);
    setDropTargetTaskId(null);
  };

  const stopDayTaskDragging = () => {
    draggingTaskIdRef.current = null;
    setDraggingTaskId(null);
    setDragOffsetY(0);
    setDropTargetTaskId(null);
    document.body.style.touchAction = previousBodyTouchActionRef.current;
    document.body.style.userSelect = previousBodyUserSelectRef.current;
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!draggingTaskIdRef.current) return;
      event.preventDefault();

      const nextOffsetY = event.clientY - dragStartYRef.current;
      setDragOffsetY(nextOffsetY);

      if (Math.abs(nextOffsetY) > 4) dragClickBlockRef.current = true;

      const rowHeight = 48;
      const step = Math.trunc(nextOffsetY / rowHeight);
      if (step === dragLastStepRef.current) return;

      const direction = step > 0 ? 1 : -1;
      dragStartYRef.current = event.clientY;
      setDragOffsetY(0);

      const activeKey = String(draggingTaskIdRef.current);

      setSelectedDayTasks((current) => {
        const fromIndex = current.findIndex((task) => String(task.id) === activeKey);
        if (fromIndex < 0) return current;

        const toIndex = Math.max(0, Math.min(current.length - 1, fromIndex + direction));
        if (fromIndex === toIndex) return current;

        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        onReorderLongTasks?.(next.map((task) => task.id));
        return next;
      });
    };

    const handlePointerUp = () => {
      if (!draggingTaskIdRef.current) return;
      stopDayTaskDragging();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [onReorderLongTasks]);

  const getHiddenTaskCountForDay = (day) => {
    const weekDays = weeks.find((week) => week.some((weekDay) => dateKey(weekDay) === dateKey(day)));
    if (!weekDays) return 0;

    const visibleTasks = longTasks.map((task) => ({ task, placement: getTaskPlacement(task, weekDays) })).filter((item) => item.placement);
    const shownTasks = visibleTasks.slice(0, 3);
    const taskCountOnDay = getTasksOnDay(longTasks, day).length;
    const shownTaskCountOnDay = shownTasks.filter(({ task }) => getTasksOnDay([task], day).length > 0).length;

    return Math.max(0, taskCountOnDay - shownTaskCountOnDay);
  };

  const openDayTasks = (day) => {
    setSelectedDate(new Date(day));
    const tasksOnDay = getTasksOnDay(longTasks, day);

    if (tasksOnDay.length >= 3 || getHiddenTaskCountForDay(day) > 0) {
      setSelectedDayTasks(tasksOnDay);
      setSelectedDayLabel(`${day.getMonth() + 1}月${day.getDate()}日`);
    } else {
      setSelectedDayTasks([]);
      setSelectedDayLabel("");
    }
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="relative flex h-11 shrink-0 items-center justify-center bg-white pt-1">
        <button type="button" onClick={() => onCenterMonth?.(currentDate)} className="inline-flex items-center gap-1 px-2 py-1 text-[17px] font-black text-slate-900 transition active:scale-[0.98] active:text-emerald-600">
          <span>{currentDate.getFullYear()}年{currentDate.getMonth() + 1}月</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {!isThisMonth && (
          <button type="button" onClick={() => { const now = new Date(); onMoveToMonth?.(new Date(now.getFullYear(), now.getMonth(), 1)); }} className="absolute right-3 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600 active:scale-[0.97]">
            今月に戻る
          </button>
        )}
      </div>

      <div className="grid h-8 shrink-0 grid-cols-7 border-b border-slate-200">
        {["月", "火", "水", "木", "金", "土", "日"].map((day, index) => (
          <div key={day} className={`grid place-items-center text-[12px] font-black ${index === 5 ? "text-blue-500" : index === 6 ? "text-red-500" : "text-slate-950"}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-6">
        {weeks.map((weekDays, weekIndex) => {
          const visibleTasks = longTasks.map((task) => ({ task, placement: getTaskPlacement(task, weekDays) })).filter((item) => item.placement);
          const shownTasks = visibleTasks.slice(0, 3);

          return (
            <div key={weekIndex} data-week-row="true" className="relative grid min-h-0 grid-cols-7 border-b border-slate-100 last:border-b-0">
              {weekDays.map((day, dayIndex) => {
                const isCurrentMonth = day.getMonth() === month;
                const isToday = dateKey(day) === todayKey;
                const isSelected = selectedDate && dateKey(day) === dateKey(selectedDate);
                const isSaturday = dayIndex === 5;
                const isSunday = dayIndex === 6;
                const taskCountOnDay = getTasksOnDay(longTasks, day).length;
                const shownTaskCountOnDay = shownTasks.filter(({ task }) => getTasksOnDay([task], day).length > 0).length;
                const hiddenTaskCount = Math.max(0, taskCountOnDay - shownTaskCountOnDay);

                return (
                  <button type="button" key={dateKey(day)} onClick={() => openDayTasks(day)} className={`relative z-0 flex min-h-0 items-start border-r border-slate-100 px-0.5 pb-1 pt-0.5 text-left last:border-r-0 ${isSelected ? "bg-emerald-50/70" : ""}`}>
                    <div className="relative h-full w-full">
                      <div className={`ml-1 mt-[1px] grid h-6 w-6 place-items-center rounded-full text-[12px] font-black leading-6 ${isToday ? "bg-slate-900 text-white" : !isCurrentMonth ? "text-slate-300" : isSaturday ? "text-blue-500" : isSunday ? "text-red-500" : "text-slate-950"}`}>
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
                {shownTasks.map(({ task, placement }, rowIndex) => (
                  <button type="button" key={`${task.id}-${weekIndex}`} onClick={(event) => {
                    event.stopPropagation();
                    const weekRow = event.currentTarget.closest('[data-week-row="true"]');
                    if (!weekRow) return;
                    const rect = weekRow.getBoundingClientRect();
                    const colWidth = rect.width / 7;
                    const clickedIndex = Math.min(6, Math.max(0, Math.floor((event.clientX - rect.left) / colWidth)));
                    const targetDay = weekDays[clickedIndex];
                    const tasksOnDay = getTasksOnDay(longTasks, targetDay);

                    if (tasksOnDay.length >= 3 || getHiddenTaskCountForDay(targetDay) > 0) {
                      setSelectedDayTasks(tasksOnDay);
                      setSelectedDayLabel(`${targetDay.getMonth() + 1}月${targetDay.getDate()}日`);
                    } else {
                      onOpenLongTask(task);
                    }
                  }} className="pointer-events-auto relative flex h-[13px] items-center transition-all duration-200" style={{ ...placement, gridRow: `${rowIndex + 1}` }}>
                    <span className={`${task.color ?? "bg-emerald-400"} block h-[12px] w-full truncate rounded-r-full px-1.5 text-[7.5px] font-black leading-[12px] text-white shadow-sm`}>
                      {task.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDayTasks.length > 0 && (
        <div className="absolute inset-x-3 bottom-3 z-30 rounded-3xl border border-slate-100 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[14px] font-black text-slate-950">{selectedDayLabel} の長期タスク</p>
          </div>

          <div className="space-y-2">
            {selectedDayTasks.map((task) => (
              <button type="button" key={task.id} data-long-task-row="true" data-task-id={task.id} onClick={() => {
                if (dragClickBlockRef.current) {
                  dragClickBlockRef.current = false;
                  return;
                }
                setSelectedDayTasks([]);
                onOpenLongTask(task);
              }} style={draggingTaskId === task.id ? { transform: `translate3d(0, ${dragOffsetY}px, 0) scale(1.015)` } : undefined} className={`relative flex h-10 w-full items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 text-left transition-transform active:bg-slate-100 ${String(draggingTaskId) === String(task.id) ? "z-[999] opacity-95 shadow-[0_14px_30px_rgba(15,23,42,0.18)] ring-1 ring-slate-200" : ""} ${String(dropTargetTaskId) === String(task.id) && String(draggingTaskId) !== String(task.id) ? "bg-emerald-50 ring-2 ring-emerald-100" : ""}`}>
                <span onPointerDown={(event) => beginDayTaskDragging(event, task.id)} className={`mr-0.5 flex h-8 w-8 shrink-0 touch-none select-none items-center justify-center rounded-xl border transition-all ${draggingTaskId === task.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-white text-slate-300 active:bg-slate-100"}`}>
                  <GripVertical className="h-4 w-4" />
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.color ?? "bg-emerald-400"}`} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-black text-slate-900">{task.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function WeekCalendar({ currentDate, setCurrentDate, selectedDate, setSelectedDate, longTasks, shortTasks, onOpenLongTask }) {
  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const todayKey = dateKey(new Date());
  const selectedKey = dateKey(selectedDate);

  const longBars = useMemo(() => {
    return longTasks
      .map((task) => ({
        task,
        placement: getTaskPlacement(task, weekDays),
      }))
      .filter((item) => item.placement);
  }, [longTasks, weekDays]);

  const weekShortTasks = useMemo(() => {
    return weekDays.flatMap((day) => {
      const key = dateKey(day);
      return (shortTasks ?? []).filter((todo) => getTodoDateKey(todo) === key);
    });
  }, [shortTasks, weekDays]);

  const weekShortMinutes = weekShortTasks.reduce((sum, todo) => sum + Number(todo.estimatedMinutes || 0), 0);

  const weekLongDailyCount = weekDays.reduce((sum, day) => {
    return sum + getLongDailyTasksForDate(longTasks, dateKey(day)).length;
  }, 0);

  const getShortTasksForDay = (day) => {
    const key = dateKey(day);
    return (shortTasks ?? []).filter((todo) => getTodoDateKey(todo) === key);
  };

  const getShortMinutesForDay = (day) => {
    return getShortTasksForDay(day).reduce((sum, todo) => sum + Number(todo.estimatedMinutes || 0), 0);
  };

  return (
    <section className="mx-3 mt-2 min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-slate-100 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 bg-white px-3 pb-3 pt-3">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setCurrentDate(addDays(weekStart, -7))} className="grid h-10 w-10 place-items-center rounded-2xl text-slate-500 active:bg-slate-100">
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="text-[18px] font-black tracking-[-0.04em] text-slate-950">{formatWeekRange(weekStart)}</p>
            <p className="mt-1 text-[11px] font-black text-slate-400">長期タスクと今日のTodoを1週間で確認</p>
          </div>

          <button type="button" onClick={() => setCurrentDate(addDays(weekStart, 7))} className="grid h-10 w-10 place-items-center rounded-2xl text-slate-500 active:bg-slate-100">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <WeekSummaryCard icon={<Sprout className="h-4 w-4" />} label="長期タスク" value={`${weekLongDailyCount}件`} color="text-emerald-500" />
          <WeekSummaryCard icon={<CheckCircle2 className="h-4 w-4" />} label="短期Todo" value={`${weekShortTasks.length}件`} sub={formatMinutesCompact(weekShortMinutes)} color="text-blue-500" />
          <WeekSummaryCard icon={<Flag className="h-4 w-4" />} label="期間タスク" value={`${longBars.length}件`} color="text-violet-500" />
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
        {weekDays.map((day, index) => {
          const key = dateKey(day);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const isSaturday = index === 5;
          const isSunday = index === 6;
          const shortCount = getShortTasksForDay(day).length;
          const shortMinutes = getShortMinutesForDay(day);
          const longCount = getLongDailyTasksForDate(longTasks, key).length;

          return (
            <button key={key} type="button" onClick={() => setSelectedDate(new Date(day))} className={`relative min-h-[98px] border-r border-slate-100 px-1 py-2 text-center last:border-r-0 active:bg-emerald-50 ${isSelected ? "bg-emerald-50/70" : "bg-white"}`}>
              <div className={`mx-auto flex h-full min-h-[84px] flex-col items-center justify-center rounded-2xl px-1 ${isToday ? "bg-emerald-500 text-white shadow-[0_10px_20px_rgba(16,185,129,0.22)]" : isSelected ? "bg-white text-emerald-700 ring-1 ring-emerald-200" : "text-slate-950"}`}>
                <p className={`text-[11px] font-black ${isToday ? "text-white" : isSaturday ? "text-blue-500" : isSunday ? "text-red-500" : "text-slate-700"}`}>
                  {["月", "火", "水", "木", "金", "土", "日"][index]}
                </p>
                <p className={`mt-0.5 text-[15px] font-black leading-none ${isToday ? "text-white" : isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-slate-950"}`}>
                  {day.getMonth() + 1}/{day.getDate()}
                </p>

                <p className={`mt-2 text-[12px] font-black leading-none ${isToday ? "text-white" : "text-slate-700"}`}>
                  {shortCount + longCount}件
                </p>
                <p className={`mt-1 text-[10px] font-black leading-none ${isToday ? "text-emerald-50" : "text-slate-400"}`}>
                  {formatMinutesCompact(shortMinutes)}
                </p>

                {(shortCount > 0 || longCount > 0) && (
                  <div className="mt-2 flex justify-center gap-1.5">
                    {longCount > 0 && <span className={`h-2 w-2 rounded-full ${isToday ? "bg-white" : "bg-emerald-500"}`} />}
                    {shortCount > 0 && <span className={`h-2 w-2 rounded-full ${isToday ? "bg-blue-100" : "bg-blue-500"}`} />}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <section className="border-b border-slate-100 bg-white px-3 py-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Sprout className="h-4 w-4" />
          </span>
          <p className="text-[15px] font-black text-slate-950">長期タスク</p>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-slate-100 bg-white">
          {longBars.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] font-black text-slate-400">この週の長期タスクはありません</p>
            </div>
          ) : (
            longBars.map(({ task, placement }) => {
              const remainingDays = getLongTaskRemainingDays(task, new Date());
              const labelColor = task.color ?? "bg-emerald-400";
              const textColor = labelColor.includes("blue")
                ? "text-blue-600"
                : labelColor.includes("violet") || labelColor.includes("purple")
                  ? "text-violet-600"
                  : labelColor.includes("amber") || labelColor.includes("yellow") || labelColor.includes("orange")
                    ? "text-orange-600"
                    : "text-emerald-600";

              return (
                <div key={task.id} className="relative grid min-h-[88px] grid-cols-[126px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0">
                  <button type="button" onClick={() => onOpenLongTask(task)} className="flex flex-col justify-center px-3 text-left active:bg-slate-50">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.color ?? "bg-emerald-400"}`} />
                      <p className={`line-clamp-2 text-[12px] font-black leading-tight ${textColor}`}>{task.title}</p>
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-slate-400">
                      {task.start}〜{task.end}
                    </p>
                  </button>

                  {weekDays.map((day) => (
                    <div key={`${task.id}-${dateKey(day)}-grid`} className="border-l border-dashed border-slate-100" />
                  ))}

                  <div className="pointer-events-none absolute bottom-[28px] left-[126px] right-2 top-[18px] grid grid-cols-7">
                    <button type="button" onClick={() => onOpenLongTask(task)} className="pointer-events-auto flex h-[26px] items-center" style={placement}>
                      <span className={`flex h-[26px] w-full items-center justify-end rounded-r-full px-2 text-[10px] font-black shadow-sm ${task.color ?? "bg-emerald-400"} bg-opacity-25 ${textColor}`}>
                        {remainingDays > 0 ? `残り${remainingDays}日` : "終了"}
                      </span>
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-[126px] right-2 grid grid-cols-7">
                    {weekDays.map((day) => {
                      const labels = getLongDailyLabels(task, dateKey(day));

                      return (
                        <div key={`${task.id}-${dateKey(day)}-labels`} className="min-w-0 px-1 text-center">
                          {labels.length === 0 ? (
                            <p className="text-[10px] font-black text-slate-300">−</p>
                          ) : (
                            labels.slice(0, 2).map((label, index) => (
                              <p key={`${label.title}-${index}`} className={`truncate text-[9.5px] font-black leading-[13px] ${label.completed ? "text-slate-300 line-through" : "text-slate-700"}`}>
                                {label.title}
                              </p>
                            ))
                          )}
                          {labels.length > 2 && (
                            <p className="text-[9px] font-black text-emerald-500">+{labels.length - 2}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="bg-white px-3 py-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <p className="text-[15px] font-black text-emerald-700">短期（今日のTodo）</p>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, index) => {
            const key = dateKey(day);
            const tasks = getShortTasksForDay(day);
            const minutes = getShortMinutesForDay(day);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const isSaturday = index === 5;
            const isSunday = index === 6;

            return (
              <button key={key} type="button" onClick={() => setSelectedDate(new Date(day))} className={`min-h-[190px] rounded-[18px] border px-1.5 py-2 text-left transition active:bg-emerald-50 ${isSelected ? "border-emerald-300 bg-emerald-50/70 shadow-[0_8px_18px_rgba(16,185,129,0.10)]" : "border-slate-100 bg-white"} ${isToday ? "ring-1 ring-emerald-200" : ""}`}>
                <div className="mb-2 text-center">
                  <p className={`text-[11px] font-black ${isSaturday ? "text-blue-500" : isSunday ? "text-red-500" : "text-slate-700"}`}>
                    {["月", "火", "水", "木", "金", "土", "日"][index]}
                  </p>
                  <p className={`text-[14px] font-black ${isToday ? "text-emerald-600" : isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-slate-950"}`}>
                    {day.getMonth() + 1}/{day.getDate()}
                  </p>
                  <p className="mt-1 text-[9.5px] font-black text-slate-400">
                    {tasks.length}件 / {formatMinutesCompact(minutes)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  {tasks.length === 0 ? (
                    <p className="pt-3 text-center text-[12px] font-black text-slate-300">−</p>
                  ) : (
                    tasks.map((todo) => (
                      <div key={todo.id} className="flex min-w-0 items-start gap-1">
                        <span className={`mt-[4px] h-2 w-2 shrink-0 rounded-full ${isCompleted(todo) ? "bg-slate-300" : getTodoColor(todo)}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`line-clamp-2 text-[9.5px] font-black leading-[13px] ${isCompleted(todo) ? "text-slate-300 line-through" : "text-slate-800"}`}>
                            {todo.title || "タスク名なし"}
                          </p>
                          {Number(todo.estimatedMinutes) > 0 && (
                            <p className="text-[9px] font-bold leading-[12px] text-slate-400">{todo.estimatedMinutes}分</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function WeekSummaryCard({ icon, label, value, sub, color }) {
  return (
    <div className="rounded-[22px] bg-slate-50 px-3 py-3 text-center">
      <div className={`mx-auto mb-1 flex items-center justify-center gap-1.5 text-[11px] font-black ${color}`}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-[20px] font-black tracking-[-0.05em] text-slate-950">{value}</p>
      {sub && (
        <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-black text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          {sub}
        </p>
      )}
    </div>
  );
}

function MonthSummary({ expanded, setExpanded, longTasks, onAddLongTask, currentDate }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);

  const visibleTasks = longTasks.filter((task) => {
    const start = parseDate(task.start);
    const end = parseDate(task.end);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return end >= monthStart && start <= monthEnd;
  });

  const totalCount = visibleTasks.length;

  const waitingCount = visibleTasks.filter((task) => {
    const start = parseDate(task.start);
    start.setHours(0, 0, 0, 0);
    return start > today;
  }).length;

  const activeCount = visibleTasks.filter((task) => {
    const start = parseDate(task.start);
    const end = parseDate(task.end);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return start <= today && today <= end;
  }).length;

  const urgentCount = visibleTasks.filter((task) => {
    const end = parseDate(task.end);
    end.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - today) / 86400000);
    return diffDays >= 0 && diffDays <= 2;
  }).length;

  const completedCount = visibleTasks.filter((task) => {
    const end = parseDate(task.end);
    end.setHours(0, 0, 0, 0);
    return end < today;
  }).length;

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
          <SummaryItem label="残り3日" value={urgentCount ? `${urgentCount}件` : ""} />
          <SummaryItem label="完了" value={completedCount ? `${completedCount}件` : ""} />

          <button type="button" onClick={onAddLongTask} className="ml-3 flex min-w-[58px] flex-col items-center justify-center gap-1 text-emerald-600 active:scale-[0.98]">
            <Plus className="h-5 w-5" />
            <span className="text-[10px] font-black leading-tight">長期タスク<br />を追加</span>
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

export default function CalendarPage({ appData, setAppData, onNavigate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  const LONG_TASKS_STORAGE_KEY = "todo-app-long-tasks-v1";
  const CATEGORIES_STORAGE_KEY = "todo-app-long-task-categories-v1";

  const [longTasks, setLongTasks] = useState(() => {
    const fromAppData = appData?.longTasks;

    if (Array.isArray(fromAppData) && fromAppData.length > 0) {
      return normalizeLongTaskList(fromAppData);
    }

    try {
      const saved = localStorage.getItem(LONG_TASKS_STORAGE_KEY);
      return saved ? normalizeLongTaskList(JSON.parse(saved)) : initialLongTasks;
    } catch {
      return initialLongTasks;
    }
  });

  const [longTaskCategories, setLongTaskCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [{ name: "仕事", color: "bg-blue-500" }];
    } catch {
      return [{ name: "仕事", color: "bg-blue-500" }];
    }
  });

  const [isLongTaskModalOpen, setIsLongTaskModalOpen] = useState(false);
  const [selectedLongTaskId, setSelectedLongTaskId] = useState(null);
  const [editingLongTask, setEditingLongTask] = useState(null);

  const selectedLongTask = useMemo(() => {
    if (!selectedLongTaskId) return null;
    return longTasks.find((task) => String(task.id) === String(selectedLongTaskId)) ?? null;
  }, [longTasks, selectedLongTaskId]);

  const shortTasks = appData?.tasks ?? [];

  useEffect(() => {
    if (!Array.isArray(appData?.longTasks)) return;
    setLongTasks(normalizeLongTaskList(appData.longTasks));
  }, [appData?.longTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(LONG_TASKS_STORAGE_KEY, JSON.stringify(longTasks));
    } catch (error) {
      console.error("長期タスクの保存に失敗しました", error);
    }
  }, [longTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(longTaskCategories));
    } catch (error) {
      console.error("長期タスクカテゴリの保存に失敗しました", error);
    }
  }, [longTaskCategories]);

  useEffect(() => {
    setLongTaskCategories((current) => {
      const map = new Map(current.map((item) => [item.name, item]));

      longTasks.forEach((task) => {
        if (!task.category) return;

        if (!map.has(task.category)) {
          map.set(task.category, {
            name: task.category,
            color: task.color ?? "bg-slate-400",
          });
        }
      });

      return Array.from(map.values());
    });
  }, [longTasks]);

  const saveLongTask = (task) => {
    const normalizedTask = normalizeLongTaskShape(task);
    const oldTask = longTasks.find((item) => String(item.id) === String(normalizedTask.id));

    const savedTask = {
      ...normalizedTask,
      dailyPlans: buildDailyPlansForTask(normalizedTask, oldTask?.dailyPlans ?? normalizedTask.dailyPlans ?? []),
    };

    setLongTasks((current) => {
      const exists = current.some((item) => String(item.id) === String(savedTask.id));

      if (exists) {
        return current.map((item) => (String(item.id) === String(savedTask.id) ? savedTask : item));
      }

      return [...current, savedTask];
    });

    setAppData?.((currentAppData) => {
      const currentLongTasks = currentAppData.longTasks ?? [];
      const exists = currentLongTasks.some((item) => String(item.id) === String(savedTask.id));

      return {
        ...currentAppData,
        longTasks: exists
          ? currentLongTasks.map((item) => (String(item.id) === String(savedTask.id) ? savedTask : item))
          : [...currentLongTasks, savedTask],
      };
    });

    setCurrentDate(new Date(savedTask.start));
    setSelectedDate(new Date(savedTask.start));
    setEditingLongTask(null);
    setIsLongTaskModalOpen(false);
    setSelectedLongTaskId(savedTask.id);
  };

  const openLongTaskDetail = (task) => {
    if (!task?.id) return;
    setSelectedLongTaskId(task.id);
  };

  const closeLongTaskDetail = () => {
    setSelectedLongTaskId(null);
  };

  const deleteLongTask = (task) => {
    const targetId = String(task.id);

    setLongTasks((current) => current.filter((item) => String(item.id) !== targetId));

    setAppData?.((currentAppData) => ({
      ...currentAppData,
      longTasks: (currentAppData.longTasks ?? []).filter((item) => String(item.id) !== targetId),
    }));

    setSelectedLongTaskId(null);
  };

  const updateDailyPlan = (task, updatedRow, nextRows) => {
    setLongTasks((current) =>
      current.map((item) =>
        String(item.id) === String(task.id)
          ? {
              ...item,
              dailyPlans: nextRows,
            }
          : item
      )
    );

    setAppData?.((currentAppData) => ({
      ...currentAppData,
      longTasks: (currentAppData.longTasks ?? []).map((item) =>
        String(item.id) === String(task.id)
          ? {
              ...item,
              dailyPlans: nextRows,
            }
          : item
      ),
    }));

    setSelectedLongTaskId(task.id);
  };

  const updateLongTask = (updatedTask) => {
    setLongTasks((current) =>
      current.map((item) =>
        String(item.id) === String(updatedTask.id)
          ? {
              ...item,
              ...updatedTask,
            }
          : item
      )
    );

    setAppData?.((currentAppData) => ({
      ...currentAppData,
      longTasks: (currentAppData.longTasks ?? []).map((item) =>
        String(item.id) === String(updatedTask.id)
          ? {
              ...item,
              ...updatedTask,
            }
          : item
      ),
    }));

    setSelectedLongTaskId(updatedTask.id);
  };

  const openEditLongTask = (task) => {
    const latestTask = longTasks.find((item) => String(item.id) === String(task.id)) ?? task;
    setEditingLongTask(latestTask);
    setIsLongTaskModalOpen(true);
  };

  const reorderLongTasks = (orderedIds) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;

    setLongTasks((current) => {
      const orderedKeySet = new Set(orderedIds.map((id) => String(id)));
      const orderedTasks = orderedIds
        .map((id) => current.find((task) => String(task.id) === String(id)))
        .filter(Boolean);

      const otherTasks = current.filter((task) => !orderedKeySet.has(String(task.id)));

      return [...orderedTasks, ...otherTasks];
    });
  };

  return (
    <div className="h-dvh overflow-hidden bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#fbfcfb] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <main className="flex min-h-0 flex-1 flex-col pb-[calc(82px+env(safe-area-inset-bottom))]">
          <MonthTabs viewMode={viewMode} setViewMode={setViewMode} />

          {viewMode === "month" ? (
            <>
              <MonthPager currentDate={currentDate} setCurrentDate={setCurrentDate} selectedDate={selectedDate} setSelectedDate={setSelectedDate} longTasks={longTasks} onOpenLongTask={openLongTaskDetail} onReorderLongTasks={reorderLongTasks} />

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
            </>
          ) : (
            <WeekCalendar
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              longTasks={longTasks}
              shortTasks={shortTasks}
              onOpenLongTask={openLongTaskDetail}
            />
          )}
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

      <LongTaskModal open={isLongTaskModalOpen} editingTask={editingLongTask} categories={longTaskCategories} setCategories={setLongTaskCategories} onClose={() => setIsLongTaskModalOpen(false)} onSave={saveLongTask} />
    </div>
  );
}