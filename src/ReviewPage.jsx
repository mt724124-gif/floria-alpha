import { useEffect, useRef, useState } from "react";
import AppHeader from "./components/AppHeader";
import TodoModal from "./components/TodoModal";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  FileText,
  GripVertical,
  Pencil,
  RotateCcw,
  StickyNote,
  Sun,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  getOrCreateDailyRecord,
  confirmDailyRecord,
  unconfirmDailyRecord,
  syncDailyRecordFromTasks,
} from "./utils/dailyRecords";

const categoryStyles = {
  学習: { icon: BookOpen, bg: "bg-emerald-50", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-600" },
  仕事: { icon: Briefcase, bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-50 text-blue-600" },
  健康: { icon: Dumbbell, bg: "bg-violet-50", text: "text-violet-600", badge: "bg-violet-50 text-violet-600" },
  長期タスク: { icon: CalendarDays, bg: "bg-emerald-50", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-600" },
  その他: { icon: FileText, bg: "bg-slate-50", text: "text-slate-500", badge: "bg-slate-100 text-slate-500" },
};

const statusStyles = {
  pending: {
    label: "未達成",
    text: "text-rose-600",
    badge: "bg-rose-500 text-white",
    border: "border-rose-200",
    bg: "bg-rose-50/65",
    empty: "未達成タスクはありません。",
  },
  postponed: {
    label: "延期",
    text: "text-amber-600",
    badge: "bg-amber-500 text-white",
    border: "border-amber-200",
    bg: "bg-amber-50/75",
    empty: "延期タスクはありません。",
  },
  completed: {
    label: "達成",
    text: "text-emerald-600",
    badge: "bg-emerald-500 text-white",
    border: "border-emerald-200",
    bg: "bg-emerald-50/75",
    empty: "達成タスクはまだありません。",
  },
};

const statusOrder = ["pending", "postponed", "completed"];
const initialCategories = ["学習", "仕事", "健康", "その他"];

function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

function addDaysToDateKey(dateKey, diffDays) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + diffDays);
  return date.toLocaleDateString("sv-SE");
}

function getTomorrowKey(dateKey) {
  return addDaysToDateKey(dateKey, 1);
}

function formatMinutes(minutes = 0) {
  const total = Math.max(0, Number(minutes) || 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function formatJapaneseDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function formatPostponeButtonLabel(dateKey, baseDateKey) {
  const targetDateKey = dateKey ?? getTomorrowKey(baseDateKey ?? getTodayKey());
  const tomorrowKey = getTomorrowKey(baseDateKey ?? getTodayKey());
  if (targetDateKey === tomorrowKey) return "明日";
  const date = new Date(`${targetDateKey}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getTaskDateKey(task, fallbackDateKey) {
  return task?.targetDate ?? task?.date ?? task?.createdDate ?? fallbackDateKey;
}

function getActualMinutes(task, workLog) {
  const candidates = [
    workLog?.minutes,
    task?.actualMinutes,
    task?.workedMinutes,
    task?.focusMinutes,
    task?.elapsedMinutes,
  ];
  const found = candidates.find((value) => Number(value) > 0);
  return Number(found ?? 0);
}

function getInitialActualMinutes(task, workLog) {
  const minutes = getActualMinutes(task, workLog);
  return minutes > 0 ? minutes : 15;
}

function hasPlannedTime(task) {
  return Number(task?.estimatedMinutes) > 0 || Number(task?.plannedMinutes) > 0;
}

function isCompleted(task) {
  if (task?.taskStatus === "postponed") return false;
  if (task?.taskStatus === "pending") return false;
  if (task?.taskStatus === "deleted") return false;
  return task?.taskStatus === "completed" || task?.completed === true;
}

function isPostponed(task) {
  return task?.taskStatus === "postponed";
}

function getReviewStatus(task) {
  if (isPostponed(task)) return "postponed";
  if (isCompleted(task)) return "completed";
  return "pending";
}


function isLongDailyReviewTask(task) {
  return task?.type === "longDailyReview";
}

function preserveReviewTaskType(source) {
  return {
    type: isLongDailyReviewTask(source) ? "longDailyReview" : "todo",
    reminder: isLongDailyReviewTask(source) ? source.reminder : null,
    schedule: isLongDailyReviewTask(source) ? source.schedule : null,
  };
}

function updateLongDailyTaskInCalendar(longTasks, reviewTask, updater) {
  if (!isLongDailyReviewTask(reviewTask)) return longTasks ?? [];

  return (longTasks ?? []).map((longTask) => {
    if (String(longTask.id) !== String(reviewTask.parentId)) return longTask;

    return {
      ...longTask,
      dailyPlans: (longTask.dailyPlans ?? []).map((plan) => {
        if (plan.date !== reviewTask.date && plan.date !== reviewTask.targetDate) return plan;

        if (Array.isArray(plan.tasks)) {
          return {
            ...plan,
            tasks: plan.tasks.map((item, index) => {
              const itemId = item.id ?? `${longTask.id}-${plan.date}-${index}`;
              if (String(itemId) !== String(reviewTask.longDailyTaskId)) return item;
              return updater(item, plan, longTask);
            }),
          };
        }

        const planId = plan.id ?? `${longTask.id}-${plan.date}`;
        if (String(planId) !== String(reviewTask.longDailyTaskId)) return plan;
        return updater(plan, plan, longTask);
      }),
    };
  });
}


function applyLongTaskReviewToCalendar(longTasks, reviewTasks, targetDateKey) {
  const longReviewTasks = (reviewTasks ?? []).filter(isLongDailyReviewTask);
  if (longReviewTasks.length === 0) return longTasks ?? [];

  const defaultNextDateKey = getTomorrowKey(targetDateKey);

  const reviewMap = new Map(
    longReviewTasks.map((task) => [
      `${String(task.parentId)}__${String(task.longDailyTaskId)}`,
      task,
    ])
  );

  const carryMap = new Map();

  const updatedLongTasks = (longTasks ?? []).map((longTask) => {
    const nextDailyPlans = (longTask.dailyPlans ?? []).map((plan) => {
      if (plan.date !== targetDateKey) return plan;

      if (!Array.isArray(plan.tasks)) return plan;

      return {
        ...plan,
        tasks: plan.tasks.map((item, index) => {
          const longDailyTaskId = item.id ?? `${longTask.id}-${targetDateKey}-${index}`;
          const reviewTask = reviewMap.get(`${String(longTask.id)}__${String(longDailyTaskId)}`);
          if (!reviewTask) return item;

          const reviewStatus = getReviewStatus(reviewTask);
          const completed = reviewStatus === "completed";
          const postponed = reviewStatus === "postponed";
          const postponeDateKey = reviewTask.postponedToDate ?? defaultNextDateKey;

          if (postponed) {
  const carryKey = `${String(longTask.id)}__${postponeDateKey}`;
  const currentCarry = carryMap.get(carryKey) ?? [];

  currentCarry.push({
    ...item,
    id: `${longDailyTaskId}-carry-${postponeDateKey}`,
    completed: false,
    taskStatus: "pending",
    completedAt: null,
    actualMinutes: null,
    actualSeconds: null,
    selected: true,
    status: "pending",
    postponedToDate: null,
    carriedFromDate: targetDateKey,
    originalLongDailyTaskId: longDailyTaskId,
  });

  carryMap.set(carryKey, currentCarry);

  return {
    ...item,
    completed: false,
    taskStatus: "postponed",
    completedAt: null,
    postponedToDate: postponeDateKey,
    actualMinutes: reviewTask.actualMinutes ?? item.actualMinutes ?? null,
    actualSeconds: reviewTask.actualSeconds ?? item.actualSeconds ?? null,
  };
}

return {
  ...item,
  completed,
  taskStatus: completed ? "completed" : "pending",
  completedAt: completed ? reviewTask.completedAt ?? new Date().toISOString() : null,
  postponedToDate: null,
  actualMinutes: reviewTask.actualMinutes ?? item.actualMinutes ?? null,
  actualSeconds: reviewTask.actualSeconds ?? item.actualSeconds ?? null,
};
                }),
      };
    });

    return {
      ...longTask,
      dailyPlans: nextDailyPlans,
    };
  });

  return updatedLongTasks.map((longTask) => {
    const entries = Array.from(carryMap.entries()).filter(([key]) =>
      key.startsWith(`${String(longTask.id)}__`)
    );

    if (entries.length === 0) return longTask;

    let dailyPlans = longTask.dailyPlans ?? [];

    entries.forEach(([key, carryTasks]) => {
      const postponeDateKey = key.split("__")[1];
      const nextPlanExists = dailyPlans.some((plan) => plan.date === postponeDateKey);

      if (nextPlanExists) {
        dailyPlans = dailyPlans.map((plan) => {
          if (plan.date !== postponeDateKey) return plan;

          const existingIds = new Set((plan.tasks ?? []).map((task) => String(task.id)));
          const newCarryTasks = carryTasks.filter((task) => !existingIds.has(String(task.id)));

          return {
            ...plan,
            tasks: [...(plan.tasks ?? []), ...newCarryTasks],
          };
        });
        return;
      }

      dailyPlans = [
        ...dailyPlans,
        {
          id: `${longTask.id}-${postponeDateKey}`,
          date: postponeDateKey,
          tasks: carryTasks,
        },
      ];
    });

    return {
      ...longTask,
      dailyPlans,
    };
  });
}


function revertLongTaskReviewFromCalendar(longTasks, targetDateKey) {
  return (longTasks ?? []).map((longTask) => ({
    ...longTask,
    dailyPlans: (longTask.dailyPlans ?? [])
      .map((plan) => {
        if (plan.date === targetDateKey && Array.isArray(plan.tasks)) {
          return {
            ...plan,
            tasks: plan.tasks.map((item) => {
              if (item.taskStatus === "completed") {
                return {
                  ...item,
                  completed: true,
                  taskStatus: "completed",
                  postponedToDate: null,
                };
              }

              if (item.taskStatus === "postponed") {
                return {
                  ...item,
                  completed: false,
                  taskStatus: "postponed",
                  completedAt: null,
                };
              }

              return {
                ...item,
                completed: false,
                taskStatus: "pending",
                completedAt: null,
                postponedToDate: null,
              };
            }),
          };
        }

        if (!Array.isArray(plan.tasks)) return plan;

        return {
          ...plan,
          tasks: plan.tasks,
        };
      })
      .filter((plan) => !Array.isArray(plan.tasks) || plan.tasks.length > 0 || plan.date === targetDateKey),
  }));
}


function buildLongDailyReviewTasksForDate(longTasks, targetDateKey) {
  return (longTasks ?? []).flatMap((longTask) => {
    const plan = (longTask.dailyPlans ?? []).find((row) => row.date === targetDateKey);
    if (!plan) return [];

    if (Array.isArray(plan.tasks)) {
      return plan.tasks
        .filter((item) => item?.selected !== false && String(item?.title ?? "").trim())
        .map((item, index) => {
          const longDailyTaskId = item.id ?? `${longTask.id}-${targetDateKey}-${index}`;
          const completed = item.taskStatus === "completed" || item.completed === true;

          return {
            ...item,
            id: `long-review-${longTask.id}-${targetDateKey}-${longDailyTaskId}`,
            type: "longDailyReview",
            isLongTask: true,
            parentId: longTask.id,
            parentTitle: longTask.title,
            longDailyTaskId,
            date: targetDateKey,
            targetDate: targetDateKey,
            createdDate: targetDateKey,
            title: item.title || "無題の小タスク",
            detail: item.detail ?? item.memo ?? "",
            category: "長期タスク",
            estimatedMinutes: item.estimatedMinutes ?? null,
            actualMinutes: item.actualMinutes ?? 0,
            actualSeconds: item.actualSeconds ?? 0,
            workedMinutes: item.workedMinutes ?? item.actualMinutes ?? 0,
            focusMinutes: item.focusMinutes ?? item.actualMinutes ?? 0,
            elapsedMinutes: item.elapsedMinutes ?? item.actualMinutes ?? 0,
            elapsedSeconds: item.elapsedSeconds ?? item.actualSeconds ?? 0,
            completed,
            taskStatus: item.taskStatus === "postponed" ? "postponed" : completed ? "completed" : "pending",
            postponedToDate: item.postponedToDate ?? null,
            completedAt: completed ? item.completedAt ?? null : null,
          };
        });
    }

    if (String(plan.title ?? "").trim()) {
      const longDailyTaskId = plan.id ?? `${longTask.id}-${targetDateKey}`;
      const completed = plan.taskStatus === "completed" || plan.completed === true;

      return [
        {
          ...plan,
          id: `long-review-${longTask.id}-${targetDateKey}-${longDailyTaskId}`,
          type: "longDailyReview",
          isLongTask: true,
          parentId: longTask.id,
          parentTitle: longTask.title,
          longDailyTaskId,
          date: targetDateKey,
          targetDate: targetDateKey,
          createdDate: targetDateKey,
          title: plan.title,
          detail: plan.detail ?? plan.memo ?? "",
          category: "長期タスク",
          estimatedMinutes: plan.estimatedMinutes ?? null,
          actualMinutes: plan.actualMinutes ?? 0,
          actualSeconds: plan.actualSeconds ?? 0,
          workedMinutes: plan.workedMinutes ?? plan.actualMinutes ?? 0,
          focusMinutes: plan.focusMinutes ?? plan.actualMinutes ?? 0,
          elapsedMinutes: plan.elapsedMinutes ?? plan.actualMinutes ?? 0,
          elapsedSeconds: plan.elapsedSeconds ?? plan.actualSeconds ?? 0,
          completed,
          taskStatus: plan.taskStatus === "postponed" ? "postponed" : completed ? "completed" : "pending",
          postponedToDate: plan.postponedToDate ?? null,
          completedAt: completed ? plan.completedAt ?? null : null,
        },
      ];
    }

    return [];
  });
}

function getShortReviewTasksForDate(tasks, targetDateKey) {
  return (tasks ?? []).filter(
    (task) =>
      getTaskDateKey(task, targetDateKey) === targetDateKey &&
      task.type !== "longDailyReview" &&
      task.type !== "longDaily"
  );
}

function buildReviewTasksForDate(tasks, longTasks, targetDateKey) {
  return [
    ...getShortReviewTasksForDate(tasks, targetDateKey),
    ...buildLongDailyReviewTasksForDate(longTasks, targetDateKey),
  ];
}



function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.4} />
        <p className="truncate text-[10px] font-black text-slate-500">{label}</p>
      </div>
      <p className="truncate text-[14px] font-black tracking-[-0.05em] text-slate-950 min-[390px]:text-[18px]">{value}</p>
    </div>
  );
}

function SummaryCard({ record }) {
  return (
    <section className="relative mb-2 overflow-hidden rounded-[22px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 px-4 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
      <div className="relative z-10">
        <div className="mb-2.5 flex items-center gap-2">
          <Sun className="h-5 w-5 text-yellow-400" fill="currentColor" />
          <h2 className="text-[18px] font-black tracking-[-0.04em] text-slate-950">今日の記録</h2>
        </div>
        <div className="grid w-full grid-cols-3 gap-3">
          <StatItem icon={Clock} label="集中時間" value={formatMinutes(record.totalActualMinutes)} />
          <StatItem icon={Check} label="完了タスク" value={`${record.completedTaskCount ?? 0}件`} />
          <StatItem icon={Target} label="達成率" value={`${record.achievementRate ?? 0}%`} />
        </div>
      </div>
    </section>
  );
}

function WorkLogModal({ open, targetTask, targetWorkLog, completeAfterSave, onClose, onSave }) {
  const [durationHour, setDurationHour] = useState(0);
  const [durationMinute, setDurationMinute] = useState(15);

  useEffect(() => {
    if (!open) return;
    const initialMinutes = getInitialActualMinutes(targetTask, targetWorkLog);
    setDurationHour(Math.floor(initialMinutes / 60));
    setDurationMinute(initialMinutes % 60);
  }, [open, targetTask, targetWorkLog]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();
    const minutes = Number(durationHour) * 60 + Number(durationMinute);
    if (!targetTask || minutes <= 0) return;
    onSave({
      taskId: targetTask.id,
      taskTitle: targetTask.title,
      category: targetTask.category,
      minutes,
      seconds: minutes * 60,
      completeAfterSave,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-3 py-4 backdrop-blur-sm">
      <form onSubmit={submit} className="max-h-[calc(100dvh-28px)] w-full max-w-[480px] overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-slate-950">{completeAfterSave ? "実測時間を入力" : "作業データを修正"}</h2>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-black text-slate-400 active:bg-slate-100">閉じる</button>
        </div>

        <div className="mb-4 rounded-[20px] bg-emerald-50 p-4">
          <p className="text-xs font-black text-emerald-600">対象タスク</p>
          <p className="mt-1 text-base font-black text-slate-950">{targetTask?.title}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            予定時間があるタスクは、実測時間を入力すると達成に分類できます。
          </p>
        </div>

        <div className="mb-6">
          <span className="mb-2 block text-sm font-black text-slate-600">実測の作業時間</span>
          <div className="grid grid-cols-2 gap-3">
            <select value={durationHour} onChange={(e) => setDurationHour(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-[16px] font-bold outline-none focus:border-emerald-400">
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>{i}時間</option>
              ))}
            </select>
            <select value={durationMinute} onChange={(e) => setDurationMinute(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-[16px] font-bold outline-none focus:border-emerald-400">
              {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                <option key={minute} value={minute}>{String(minute).padStart(2, "0")}分</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="h-14 rounded-2xl bg-slate-100 text-base font-black text-slate-600 active:scale-[0.99]">キャンセル</button>
          <button type="submit" className="h-14 rounded-2xl bg-emerald-500 text-base font-black text-white active:scale-[0.99]">保存して達成にする</button>
        </div>
      </form>
    </div>
  );
}


function TaskRow({
  task,
  status,
  disabled = false,
  dragging = false,
  dragOffsetY = 0,
  dropTarget = false,
  dragOriginStatus = null,
  dragTargetStatus = null,
recentlyMoved = false,
recentMovedOriginStatus = null,
onMoveToCompleted,
onMoveToPending,
onEdit,
onDelete,
  onDragHandlePointerDown,
  onChangePostponeDate,
  displayPostponeDate,
  baseDateKey,
}) {
  const style = categoryStyles[task.category] ?? categoryStyles["その他"];
  const statusStyle = statusStyles[status] ?? statusStyles.pending;
const originStatus = dragOriginStatus ?? status;
const targetStatus = dragTargetStatus ?? status;
const recentOriginStyle = statusStyles[recentMovedOriginStatus] ?? null;
const originStyle = statusStyles[originStatus] ?? statusStyle;
const targetStyle = statusStyles[targetStatus] ?? statusStyle;

const dragHandleOuterClass = dragging
  ? `${originStyle.border} bg-white ${originStyle.text}`
  : "";

const dragHandleInnerClass = dragging
  ? `${targetStyle.bg} ${targetStyle.text}`
  : "";

const recentlyMovedHandleClass =
  recentlyMoved && recentOriginStyle
    ? `${recentOriginStyle.border} border-2 bg-white ${recentOriginStyle.text} shadow-[0_0_0_3px_rgba(255,255,255,0.85)]`
    : "";

const Icon = style.icon;
  const completed = isCompleted(task);
  const postponed = isPostponed(task);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartRef = useRef({ x: 0, y: 0 });
  const swipeActiveRef = useRef(false);
  const swipeLatestXRef = useRef(0);
  const swipeFrameRef = useRef(null);
  const swipePointerIdRef = useRef(null);

  const startSwipe = (event) => {
    if (disabled || dragging) return;
    if (event.pointerType === "mouse") return;

    swipePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    swipeStartRef.current = { x: event.clientX, y: event.clientY };
    swipeActiveRef.current = true;
    swipeLatestXRef.current = 0;
    setIsSwiping(false);
  };

  const moveSwipe = (event) => {
    if (!swipeActiveRef.current) return;

    const dx = event.clientX - swipeStartRef.current.x;
    const dy = event.clientY - swipeStartRef.current.y;

    if (Math.abs(dy) > 32 && Math.abs(dy) > Math.abs(dx) * 1.4) {
      swipeActiveRef.current = false;
      swipeLatestXRef.current = 0;
      setSwipeX(0);
      setIsSwiping(false);
      return;
    }

    if (Math.abs(dx) < 24) return;

    event.preventDefault();

    if (!isSwiping) setIsSwiping(true);

    const limited = Math.max(-118, Math.min(0, dx));
    swipeLatestXRef.current = limited;

    if (swipeFrameRef.current) return;

    swipeFrameRef.current = requestAnimationFrame(() => {
      setSwipeX(swipeLatestXRef.current);
      swipeFrameRef.current = null;
    });
  };

  const endSwipe = (event) => {
    if (!swipeActiveRef.current) return;

    const finalX = swipeLatestXRef.current || swipeX;

    if (swipePointerIdRef.current != null) {
      event?.currentTarget?.releasePointerCapture?.(swipePointerIdRef.current);
    }

    swipeActiveRef.current = false;
    swipeLatestXRef.current = 0;
    swipePointerIdRef.current = null;

    if (swipeFrameRef.current) {
      cancelAnimationFrame(swipeFrameRef.current);
      swipeFrameRef.current = null;
    }

    setIsSwiping(false);
    setSwipeX(0);

    if (finalX < -100) onDelete(task);
  };

  return (
    <div
      data-review-task-id={task.id}
      className={`relative overflow-visible border-b border-slate-100 last:border-b-0 ${
        dragging ? "z-[999]" : "z-0"
      } ${dropTarget && !dragging ? "bg-slate-50" : "bg-white"}`}
    >
      {!dragging && !disabled && !isLongDailyReviewTask(task) && (
        <div className="absolute inset-y-0 right-0 z-0 flex w-28 items-center justify-end bg-red-50 px-4 text-red-500">
          <span className="mr-1.5 text-xs font-black">削除</span>
          <Trash2 className="h-5 w-5" />
        </div>
      )}

      <div
        onPointerDown={startSwipe}
        onPointerMove={moveSwipe}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
        style={
          dragging
            ? { transform: `translate3d(0, ${dragOffsetY}px, 0) scale(1.015)` }
            : swipeX !== 0
              ? { transform: `translate3d(${swipeX}px, 0, 0)` }
              : undefined
        }
        className={`relative z-10 px-3 py-2 transition-all ${
  dragging
    ? "pointer-events-none z-[1000] rounded-[16px] bg-white opacity-95 shadow-[0_18px_40px_rgba(15,23,42,0.20)] ring-1 ring-slate-200 duration-100"
    : "bg-white duration-200"
}`}
      >
        <div className="flex min-h-[48px] items-center gap-2">
          <button
  type="button"
  aria-label="分類を移動"
  disabled={disabled}
  onClick={(event) => event.stopPropagation()}
  onPointerDown={(event) => {
    if (disabled) return;
    onDragHandlePointerDown(event, task);
  }}
  className={`relative flex h-10 w-9 shrink-0 touch-none select-none flex-col items-center justify-center rounded-2xl border transition-all ${
  disabled
    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-200"
    : dragging
      ? `${dragHandleOuterClass} border-2 shadow-[0_6px_14px_rgba(15,23,42,0.16)]`
      : recentlyMoved
        ? recentlyMovedHandleClass
        : status === "completed"
          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
          : status === "postponed"
            ? "border-amber-200 bg-amber-50 text-amber-600"
            : "border-rose-200 bg-rose-50 text-rose-600"
}`}
>
  {dragging && (
    <span className={`absolute inset-1 rounded-xl ${dragHandleInnerClass}`} />
  )}

  <GripVertical
    className={`relative z-10 h-5 w-5 transition-transform ${
      dragging ? "scale-110" : "scale-100"
    }`}
  />
</button>

          <button
  type="button"
  disabled={disabled}
  onClick={(event) => {
    event.stopPropagation();

    if (disabled) return;

    if (status === "completed") {
      onMoveToPending?.(task);
      return;
    }

    onMoveToCompleted?.(task);
  }}
  className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-[1.6px] ${
    status === "completed"
      ? "border-emerald-500 bg-emerald-500 text-white"
      : "border-slate-300 bg-white text-transparent"
  } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
>
  <Check className="h-3.5 w-3.5" strokeWidth={3} />
</button>

          <div className="min-w-0 flex-1 touch-manipulation select-none">
            <div className={`${isLongDailyReviewTask(task) ? "border-l-[3px] border-emerald-400 pl-2" : ""}`}>
              {isLongDailyReviewTask(task) && (
  <p className="mb-0.5 truncate text-[9px] font-bold text-emerald-600">
    {task.parentTitle ?? "長期タスク"}
  </p>
)}

<p className={`flex items-start gap-1 text-[12px] font-semibold leading-tight tracking-[-0.01em] ${
  completed ? "text-slate-400" : postponed ? "text-slate-700" : "text-slate-950"
}`}>
  <span className="line-clamp-2 break-words">{task.title || "無題のタスク"}</span>
</p>
            </div>

            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {!isLongDailyReviewTask(task) && (
  <div className={`flex items-center gap-1 ${style.text}`}>
    <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
    <span className="max-w-[52px] truncate text-[11px] font-black">
      {task.category ?? "その他"}
    </span>
  </div>
)}

              <div className="flex items-center gap-1 text-slate-400">
                <Clock className="h-3.5 w-3.5" strokeWidth={2.2} />
                <span className="text-[11px] font-bold">
                  {formatMinutes(task.actualMinutes ?? task.workedMinutes ?? task.focusMinutes ?? task.elapsedMinutes ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {postponed ? (
  <div className="relative h-8 w-[72px] shrink-0 overflow-hidden rounded-xl border border-orange-100 bg-orange-50">
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-1 px-2 text-[11px] font-black text-orange-600">
      <span>{formatPostponeButtonLabel(displayPostponeDate, baseDateKey)}</span>
      <CalendarDays className="h-3.5 w-3.5" />
    </div>

    <input
  type="date"
  disabled={disabled}
  value={displayPostponeDate ?? getTomorrowKey(baseDateKey)}
  min={getTomorrowKey(baseDateKey)}
  onChange={(event) => {
    if (disabled) return;

    const minDateKey = getTomorrowKey(baseDateKey);
    const selectedDateKey = event.target.value;

    if (!selectedDateKey || selectedDateKey < minDateKey) {
      onChangePostponeDate(task, minDateKey);
      return;
    }

    onChangePostponeDate(task, selectedDateKey);
  }}
  className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
/>
  </div>
) : (
            <button
              type="button"
              disabled={disabled}
             onClick={(event) => {
  event.stopPropagation();
  if (disabled) return;
  onEdit(task);
}}
              className={`grid h-8 w-7 shrink-0 place-items-center rounded-xl ${
                disabled || isLongDailyReviewTask(task) ? "cursor-not-allowed text-slate-200" : "text-emerald-500 active:bg-emerald-50"
              }`}
            >
              <Pencil className="h-[17px] w-[17px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskSection({
  record,
  disabled = false,
  onEditTask,
  onDeleteTask,
onMoveTaskToStatus,
moveTaskToPending,
requestCompleteTask,
  onChangePostponeDate,
  onPostponeAllPending,
  postponeDateOverrides = {},
  baseDateKey,
}) {
  const tasks = (record.tasks ?? []).filter((task) => task.taskStatus !== "deleted");
  const [openStatusKeys, setOpenStatusKeys] = useState(statusOrder);
  const [showAllStatuses, setShowAllStatuses] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [dropTargetStatus, setDropTargetStatus] = useState(null);
  const [recentMovedTaskId, setRecentMovedTaskId] = useState(null);
  const [recentMovedStatus, setRecentMovedStatus] = useState(null);
  const [recentMovedOriginStatus, setRecentMovedOriginStatus] = useState(null);
  const recentMovedTimerRef = useRef(null);
  const draggingIdRef = useRef(null);
const draggingTaskRef = useRef(null);
const startYRef = useRef(0);
  const startScrollYRef = useRef(0);
  const pendingDropRef = useRef({ targetId: null, targetStatus: null });
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef({ x: 0, y: 0, id: null });
  const previousBodyTouchActionRef = useRef("");
  const previousBodyUserSelectRef = useRef("");

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const beginDragging = (task, clientY) => {
  if (disabled) return;
  draggingIdRef.current = task.id;
  draggingTaskRef.current = task;
  startYRef.current = clientY;
    startScrollYRef.current = window.scrollY;
    previousBodyTouchActionRef.current = document.body.style.touchAction;
    previousBodyUserSelectRef.current = document.body.style.userSelect;
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
    setDraggingId(task.id);
    setDragOffsetY(0);
    pendingDropRef.current = { targetId: null, targetStatus: null };
    setDropTargetId(null);
    setDropTargetStatus(null);
  };

  const stopDragging = () => {
  clearLongPressTimer();
  draggingIdRef.current = null;
  draggingTaskRef.current = null;
  setDraggingId(null);
    setDragOffsetY(0);
    setDropTargetId(null);
    setDropTargetStatus(null);
    document.body.style.touchAction = previousBodyTouchActionRef.current;
    document.body.style.userSelect = previousBodyUserSelectRef.current;
  };

  const handleDragHandlePointerDown = (event, task) => {
  if (disabled) return;
  event.preventDefault();
  event.stopPropagation();
  clearLongPressTimer();

  longPressStartRef.current = {
    x: event.clientX,
    y: event.clientY,
    id: task.id,
  };

  longPressTimerRef.current = setTimeout(() => {
    beginDragging(task, longPressStartRef.current.y);
  }, 50);
};

  const autoScrollWhileDragging = (clientY) => {
    const edge = 96;
    const speed = 18;
    const windowHeight = window.innerHeight;

    if (clientY < edge) {
      window.scrollBy({ top: -speed, behavior: "auto" });
      return;
    }

    if (clientY > windowHeight - edge) {
      window.scrollBy({ top: speed, behavior: "auto" });
    }
  };

  const toggleShowAllStatuses = () => {
    setShowAllStatuses((current) => {
      if (current) {
        setOpenStatusKeys([]);
        return false;
      }

      setOpenStatusKeys(statusOrder);
      return true;
    });
  };

  const toggleStatusSection = (status) => {
    setOpenStatusKeys((current) => {
      const isOpen = showAllStatuses || current.includes(status);

      if (isOpen) {
        setShowAllStatuses(false);
        return current.filter((key) => key !== status);
      }

      return [...current, status];
    });
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (longPressTimerRef.current && !draggingIdRef.current) {
        const dx = Math.abs(event.clientX - longPressStartRef.current.x);
        const dy = Math.abs(event.clientY - longPressStartRef.current.y);
        if (dx > 8 || dy > 8) clearLongPressTimer();
      }

      if (!draggingIdRef.current) return;
      event.preventDefault();

      autoScrollWhileDragging(event.clientY);

      const nextOffsetY =
        event.clientY -
        startYRef.current +
        (window.scrollY - startScrollYRef.current);

      setDragOffsetY(nextOffsetY);

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const targetElement = element?.closest?.("[data-review-task-id]");
      const sectionElement = element?.closest?.("[data-drop-status]");
      const targetId = targetElement?.dataset?.reviewTaskId ?? null;
      let targetStatus = sectionElement?.dataset?.dropStatus ?? null;

      if (!targetStatus) {
        const sections = Array.from(document.querySelectorAll("[data-drop-status]"));
        const matched = sections.find((section) => {
          const rect = section.getBoundingClientRect();
          return (
            event.clientY >= rect.top - 28 &&
            event.clientY <= rect.bottom + 28 &&
            event.clientX >= rect.left - 24 &&
            event.clientX <= rect.right + 24
          );
        });
        targetStatus = matched?.dataset?.dropStatus ?? null;
      }

      if (!targetStatus) {
        const sections = Array.from(document.querySelectorAll("[data-drop-status]"));
        let nearest = null;
        let nearestDistance = Infinity;

        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          const centerY = rect.top + rect.height / 2;
          const distance = Math.abs(event.clientY - centerY);

          if (distance < nearestDistance) {
            nearest = section;
            nearestDistance = distance;
          }
        });

        if (nearest && nearestDistance < 220) {
          targetStatus = nearest.dataset?.dropStatus ?? null;
        }
      }

      setDropTargetId(targetId || null);
      setDropTargetStatus(targetStatus);

      pendingDropRef.current = {
        targetId: targetId || null,
        targetStatus,
      };
    };

    const handlePointerUp = () => {
      if (longPressTimerRef.current) clearLongPressTimer();
      if (!draggingIdRef.current) return;

      const id = draggingIdRef.current;
      const { targetStatus } = pendingDropRef.current;

      if (targetStatus) {
        const sourceTask =
  draggingTaskRef.current ??
  tasks.find((task) => String(task.id) === String(id));

const sourceStatus = sourceTask ? getReviewStatus(sourceTask) : null;

        onMoveTaskToStatus(sourceTask ?? id, targetStatus);

        setRecentMovedTaskId(id);
        setRecentMovedStatus(targetStatus);
        setRecentMovedOriginStatus(sourceStatus);

        if (recentMovedTimerRef.current) {
          clearTimeout(recentMovedTimerRef.current);
        }

        recentMovedTimerRef.current = setTimeout(() => {
          setRecentMovedTaskId(null);
          setRecentMovedStatus(null);
          setRecentMovedOriginStatus(null);
          recentMovedTimerRef.current = null;
        }, 1200);
      }

      stopDragging();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      clearLongPressTimer();
    };
  }, [disabled, onMoveTaskToStatus, tasks]);

  useEffect(() => {
    return () => {
      if (recentMovedTimerRef.current) {
        clearTimeout(recentMovedTimerRef.current);
        recentMovedTimerRef.current = null;
      }
    };
  }, []);

  return (
    <section className="relative z-20 mb-3 overflow-visible rounded-[22px] border border-slate-100 bg-white p-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
            <div className="mb-0.5 flex items-center justify-between gap-3 px-1">
        <h2 className="text-[16px] font-black tracking-[-0.03em] text-slate-950">今日のタスク</h2>

        {tasks.length > 0 && (
          <button
            type="button"
            onClick={toggleShowAllStatuses}
            className="flex h-9 shrink-0 items-center gap-2 rounded-full px-1 active:scale-[0.98]"
          >
            <span className="text-[12px] font-black text-slate-700">全表示</span>
            <span
              className={`relative block h-7 w-12 rounded-full transition-colors ${
                showAllStatuses ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute left-1 top-1 block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  showAllStatuses ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </span>
          </button>
        )}
      </div>

            <p className="mb-2 px-1 text-[10px] font-bold text-slate-400">
  ※左スライドで削除できます。
</p>

      {tasks.length === 0 ? (
        <div className="rounded-[18px] bg-emerald-50 px-4 py-5 text-center text-[13px] font-bold text-emerald-600">
          この日は記録されたTodoがありません。振り返りは完了扱いです。
        </div>
      ) : (
        <div className="space-y-2.5">
          {statusOrder.map((status) => {
            const style = statusStyles[status];
            const sectionTasks = tasks.filter((task) => getReviewStatus(task) === status);
            const collapsed = showAllStatuses ? false : !openStatusKeys.includes(status);

            return (
              <div
                key={status}
                data-drop-status={status}
                className={`rounded-[18px] border ${style.border} ${style.bg} px-2 py-1.5 ${
                  dropTargetStatus === status ? "ring-2 ring-emerald-200" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleStatusSection(status)}
                  className="flex h-7 w-full items-center gap-2 rounded-2xl px-1 active:bg-white/70"
                >
                  <p className={`text-[14px] font-black ${style.text}`}>{style.label}</p>

                  <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-black ${style.badge}`}>
                    {sectionTasks.length}
                  </span>

                  {status === "pending" && sectionTasks.length > 0 && !disabled && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onPostponeAllPending?.();
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        onPostponeAllPending?.();
                      }}
                      className="ml-auto rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-black text-orange-600 active:scale-[0.98]"
                    >
                      一括延期
                    </span>
                  )}

                  {status === "postponed" && sectionTasks.length > 0 && (
  <span className="ml-auto mr-3 text-[11px] font-black text-orange-500">
    日付変更可
  </span>
)}

<span
  className={`text-[12px] font-black text-slate-400 ${
    status === "pending" && sectionTasks.length > 0 && !disabled
      ? ""
      : status === "postponed" && sectionTasks.length > 0
        ? ""
        : "ml-auto"
  }`}
>
  {collapsed ? "開く" : "閉じる"}
</span>
                </button>

                {!collapsed && (
                  <div className="overflow-visible rounded-[16px] bg-white">
                    {sectionTasks.length === 0 ? (
                      <div className="rounded-[16px] bg-white/75 px-4 py-4 text-center text-[12px] font-bold text-slate-400">
                        {style.empty}
                      </div>
                    ) : (
                      sectionTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          status={status}
                          disabled={disabled}
                          dragging={String(draggingId) === String(task.id)}
                          dragOffsetY={String(draggingId) === String(task.id) ? dragOffsetY : 0}
                          dropTarget={String(dropTargetId) === String(task.id)}
                          dragOriginStatus={status}
                          dragTargetStatus={String(recentMovedTaskId) === String(task.id) ? recentMovedStatus : dropTargetStatus}
                          recentlyMoved={String(recentMovedTaskId) === String(task.id)}
                          recentMovedOriginStatus={String(recentMovedTaskId) === String(task.id) ? recentMovedOriginStatus : null}
                          onMoveToCompleted={requestCompleteTask}
onMoveToPending={moveTaskToPending}
onEdit={onEditTask}
onDelete={onDeleteTask}
                          onDragHandlePointerDown={handleDragHandlePointerDown}
                          onChangePostponeDate={onChangePostponeDate}
                          displayPostponeDate={postponeDateOverrides[task.id] ?? task.postponedToDate}
                          baseDateKey={baseDateKey}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReflectionSection({ reflectionText, setReflectionText, disabled = false }) {
  return (
    <section className="mb-5 rounded-[22px] border border-slate-100 bg-white p-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center gap-2.5">
        <StickyNote className="h-5 w-5 shrink-0 text-emerald-500" strokeWidth={2.3} />
        <h2 className="text-[16px] font-black tracking-[-0.03em] text-slate-950">今日のメモ・振り返り</h2>
      </div>
      <textarea
        value={reflectionText}
        disabled={disabled}
        onChange={(event) => {
          if (disabled) return;
          setReflectionText(event.target.value);
        }}
        placeholder="AIによるフィードバックを行う際に使用されます。"
        className={`min-h-[92px] w-full resize-none rounded-[18px] border border-slate-100 p-3 text-[14px] font-bold leading-6 text-slate-800 outline-none placeholder:text-slate-400 ${
          disabled ? "bg-slate-50 text-slate-400" : "bg-slate-50 focus:border-emerald-200 focus:bg-white"
        }`}
      />
    </section>
  );
}

function UndoToast({ toast, onUndo, onClose }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-[max(70px,calc(70px+env(safe-area-inset-bottom)))] left-1/2 z-[60] flex w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{toast.message}</p>
        <p className="truncate text-xs font-bold text-slate-300">{toast.taskTitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={onUndo} className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-emerald-200 active:scale-[0.98]">
          <RotateCcw className="h-4 w-4" />
          元に戻す
        </button>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 active:scale-[0.98]">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ReviewPage({ dateKey, appData, setAppData, onNavigate }) {
  const [todoModal, setTodoModal] = useState({ open: false, mode: "edit", todo: null });
  const [workLogModal, setWorkLogModal] = useState({ open: false, task: null, completeAfterSave: false });
  const [postponeDateOverrides, setPostponeDateOverrides] = useState({});
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);

  const shortReviewTasks = getShortReviewTasksForDate(appData?.tasks ?? [], dateKey);
  const longReviewTasks = buildLongDailyReviewTasksForDate(appData?.longTasks ?? [], dateKey);
  const reviewTasks = [...shortReviewTasks, ...longReviewTasks];
  const syncedDailyRecords = syncDailyRecordFromTasks(appData?.dailyRecords ?? {}, dateKey, reviewTasks);
const record = getOrCreateDailyRecord(syncedDailyRecords, dateKey);
const rawRecord = appData?.dailyRecords?.[dateKey] ?? {};

const displayRecord = {
  ...record,
  status:
    rawRecord.status === "confirmed" || rawRecord.reviewCompleted === true
      ? "confirmed"
      : "editing",
  reviewCompleted:
    rawRecord.status === "confirmed" || rawRecord.reviewCompleted === true,
};

const activeTasks = reviewTasks.filter((task) => task.taskStatus !== "deleted");
const incompleteTasks = activeTasks.filter((task) => getReviewStatus(task) === "pending");
const taskCount = activeTasks.length;
const isAutoCompletedEmptyDay = taskCount === 0;
const isConfirmed = rawRecord.status === "confirmed" || rawRecord.reviewCompleted === true;
const canConfirm = !isConfirmed && incompleteTasks.length === 0;
  const todayKey = getTodayKey();
  const defaultPostponeDateKey = getTomorrowKey(dateKey);

  const [reflectionText, setReflectionText] = useState(record.reflectionText ?? "");

  useEffect(() => {
    setReflectionText(record.reflectionText ?? "");
  }, [dateKey]);

  useEffect(() => {
    if (!isAutoCompletedEmptyDay || record.reviewCompleted) return;

    setAppData((current) => ({
      ...current,
      dailyRecords: confirmDailyRecord(
        syncDailyRecordFromTasks(current.dailyRecords ?? {}, dateKey, []),
        dateKey,
        { reflectionText: current.dailyRecords?.[dateKey]?.reflectionText ?? "" }
      ),
    }));
  }, [isAutoCompletedEmptyDay, record.reviewCompleted, dateKey, setAppData]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isConfirmed) return;

    setAppData((current) => {
      const hasClonesFromThisDate = (current.tasks ?? []).some((task) => task.postponedFromDate === dateKey);
      if (!hasClonesFromThisDate) return current;

      const nextTasks = (current.tasks ?? [])
        .filter((task) => task.postponedFromDate !== dateKey)
        .map((task) =>
          getTaskDateKey(task, dateKey) === dateKey
            ? { ...task, postponedCloneId: null }
            : task
        );

      return {
        ...current,
        tasks: nextTasks,
        dailyRecords: syncCurrentDateRecords(current, nextTasks),
      };
    });
  }, [isConfirmed, dateKey, setAppData]);

  const showUndoToast = (toast) => {
    setUndoToast(toast);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 4200);
  };

  const syncCurrentDateRecords = (current, nextTasks, nextLongTasks = current.longTasks ?? []) => {
    return syncDailyRecordFromTasks(
      current.dailyRecords ?? {},
      dateKey,
      buildReviewTasksForDate(nextTasks, nextLongTasks, dateKey)
    );
  };


  const setLongReviewTaskStatus = (task, nextStatus, options = {}) => {
    if (isConfirmed || !isLongDailyReviewTask(task)) return;

    const nextCompleted = nextStatus === "completed";
    const nextPostponed = nextStatus === "postponed";
    const completedAt = nextCompleted ? new Date().toISOString() : null;
    const postponedToDate = nextPostponed ? options.postponedToDate ?? defaultPostponeDateKey : null;

    setAppData((current) => {
  const nextLongTasks = updateLongDailyTaskInCalendar(current.longTasks ?? [], task, (item) => ({
        ...item,
        completed: nextCompleted,
        taskStatus: nextCompleted ? "completed" : nextPostponed ? "postponed" : "pending",
        completedAt,
        postponedToDate,
        actualMinutes: task.actualMinutes ?? item.actualMinutes ?? 0,
        actualSeconds: task.actualSeconds ?? item.actualSeconds ?? 0,
        workedMinutes: task.workedMinutes ?? task.actualMinutes ?? item.workedMinutes ?? 0,
        focusMinutes: task.focusMinutes ?? task.actualMinutes ?? item.focusMinutes ?? 0,
        elapsedMinutes: task.elapsedMinutes ?? task.actualMinutes ?? item.elapsedMinutes ?? 0,
        elapsedSeconds: task.elapsedSeconds ?? task.actualSeconds ?? item.elapsedSeconds ?? 0,
      }));

  const syncedRecords = syncCurrentDateRecords(current, current.tasks ?? [], nextLongTasks);

  return {
    ...current,
    longTasks: nextLongTasks,
    dailyRecords: nextCompleted ? syncedRecords : unconfirmDailyRecord(syncedRecords, dateKey),
  };
});
  };

  const completeTask = (task, forcedMinutes = null) => {
  if (isLongDailyReviewTask(task)) {
    setLongReviewTaskStatus(task, "completed");
    return;
  }

  const workLog = (appData?.workLogs ?? []).find((log) => log.taskId === task.id);
  const minutes = forcedMinutes != null ? Number(forcedMinutes) : getActualMinutes(task, workLog);
  const seconds = minutes * 60;

  setAppData((current) => {
    const sourceTasks = task.postponedCloneId
      ? (current.tasks ?? []).filter((item) => item.id !== task.postponedCloneId)
      : (current.tasks ?? []);

    const nextTasks = sourceTasks.map((item) =>
      item.id === task.id
        ? {
            ...item,
            completed: true,
            taskStatus: "completed",
            completedAt: new Date().toISOString(),
            actualMinutes: minutes,
            actualSeconds: seconds,
            workedMinutes: minutes,
            focusMinutes: minutes,
            elapsedMinutes: minutes,
            elapsedSeconds: seconds,
            postponedToDate: null,
            ...preserveReviewTaskType(item),
          }
        : item
    );

      const nextWorkLogs = minutes > 0
        ? [
            ...(current.workLogs ?? []).filter((log) => log.taskId !== task.id),
            { id: Date.now(), taskId: task.id, taskTitle: task.title, category: task.category, minutes, seconds, date: dateKey },
          ]
        : (current.workLogs ?? []).filter((log) => log.taskId !== task.id);

      const nextLongTasks = undoToast?.previousLongTasks ?? current.longTasks ?? [];

      return {
        ...current,
        tasks: nextTasks,
        longTasks: nextLongTasks,
        workLogs: nextWorkLogs,
        dailyRecords: syncCurrentDateRecords(current, nextTasks, nextLongTasks),
      };
    });
  };

  const removePostponedClone = (tasks, sourceTask) => {
    const cloneId = sourceTask?.postponedCloneId;
    if (!cloneId) return tasks;
    return tasks.filter((task) => task.id !== cloneId);
  };

  const createPostponedClone = (task, postponeDateKey, cloneId) => ({
    ...task,
    id: cloneId,
    completed: false,
    taskStatus: "pending",
    completedAt: null,
    actualMinutes: 0,
    actualSeconds: 0,
    workedMinutes: 0,
    focusMinutes: 0,
    elapsedMinutes: 0,
    elapsedSeconds: 0,
    targetDate: postponeDateKey,
    date: postponeDateKey,
    createdDate: task.createdDate ?? getTaskDateKey(task, dateKey),
    postponedFromDate: dateKey,
    originalTaskId: task.originalTaskId ?? task.id,
    postponedToDate: null,
    postponedCloneId: null,
    type: "todo",
    reminder: null,
    schedule: null,
  });

  const postponeTask = (task, postponeDateKey = defaultPostponeDateKey) => {
    if (isConfirmed) return;

    if (isLongDailyReviewTask(task)) {
      setLongReviewTaskStatus(task, "postponed", { postponedToDate: postponeDateKey });
      return;
    }

    const workLog = (appData?.workLogs ?? []).find((log) => log.taskId === task.id);
    const minutes = getActualMinutes(task, workLog);
    const seconds = minutes * 60;

    setAppData((current) => {
      const withoutOldClone = removePostponedClone(current.tasks ?? [], task);
      const nextTasks = withoutOldClone.map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: false,
              taskStatus: "postponed",
              completedAt: null,
              actualMinutes: minutes,
              actualSeconds: seconds,
              workedMinutes: minutes,
              focusMinutes: minutes,
              elapsedMinutes: minutes,
              elapsedSeconds: seconds,
              postponedToDate: postponeDateKey,
              postponedCloneId: null,
              ...preserveReviewTaskType(item),
            }
          : item
      );

      const nextWorkLogs = minutes > 0
        ? [
            ...(current.workLogs ?? []).filter((log) => log.taskId !== task.id),
            { id: Date.now(), taskId: task.id, taskTitle: task.title, category: task.category, minutes, seconds, date: dateKey },
          ]
        : (current.workLogs ?? []).filter((log) => log.taskId !== task.id);

      return {
        ...current,
        tasks: nextTasks,
        workLogs: nextWorkLogs,
        dailyRecords: syncCurrentDateRecords(current, nextTasks),
      };
    });
  };

  const moveTaskToPending = (task) => {
    if (isConfirmed) return;

    if (isLongDailyReviewTask(task)) {
      setLongReviewTaskStatus(task, "pending");
      return;
    }

    setAppData((current) => {
      const withoutOldClone = removePostponedClone(current.tasks ?? [], task);
      const nextTasks = withoutOldClone.map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: false,
              taskStatus: "pending",
              completedAt: null,
              postponedToDate: null,
              postponedCloneId: null,
              ...preserveReviewTaskType(item),
            }
          : item
      );

      return {
        ...current,
        tasks: nextTasks,
        dailyRecords: syncCurrentDateRecords(current, nextTasks),
      };
    });

  };


  const requestCompleteTask = (task) => {
    if (isConfirmed) return;

    const workLog = (appData?.workLogs ?? []).find((log) => log.taskId === task.id);
    const minutes = getActualMinutes(task, workLog);

    if (!isLongDailyReviewTask(task) && hasPlannedTime(task) && minutes <= 0) {
      setWorkLogModal({ open: true, task, completeAfterSave: true });
      return;
    }

    completeTask(task, minutes);
  };

  const handlePostponeAllPending = () => {
  if (isConfirmed) return;

  const pendingLongTasks = activeTasks.filter(
    (task) => isLongDailyReviewTask(task) && getReviewStatus(task) === "pending"
  );

  setAppData((current) => {
    const currentDateTasks = (current.tasks ?? []).filter(
      (task) => getTaskDateKey(task, dateKey) === dateKey
    );

    const pendingTasks = currentDateTasks.filter(
      (task) => getReviewStatus(task) === "pending" && !isLongDailyReviewTask(task)
    );

    const pendingIds = new Set(pendingTasks.map((task) => task.id));
    const pendingLongKeys = new Set(
      pendingLongTasks.map((task) => `${String(task.parentId)}__${String(task.longDailyTaskId)}`)
    );

    if (pendingIds.size === 0 && pendingLongKeys.size === 0) return current;

    const previousTasks = pendingTasks.map((task) => ({ ...task }));
    const previousLongTasks = current.longTasks ?? [];
    const previousWorkLogs = (current.workLogs ?? [])
      .filter((log) => pendingIds.has(log.taskId))
      .map((log) => ({ ...log }));

    const overrideUpdates = {};

    const nextTasks = (current.tasks ?? []).map((task) => {
      if (!pendingIds.has(task.id)) return task;

      const workLog = (current.workLogs ?? []).find((log) => log.taskId === task.id);
      const minutes = getActualMinutes(task, workLog);
      const seconds = minutes * 60;
      const nextDateKey = task.postponedToDate ?? defaultPostponeDateKey;

      overrideUpdates[task.id] = nextDateKey;

      return {
        ...task,
        completed: false,
        taskStatus: "postponed",
        completedAt: null,
        actualMinutes: minutes,
        actualSeconds: seconds,
        workedMinutes: minutes,
        focusMinutes: minutes,
        elapsedMinutes: minutes,
        elapsedSeconds: seconds,
        postponedToDate: nextDateKey,
        postponedCloneId: null,
        ...preserveReviewTaskType(task),
      };
    });

    let nextLongTasks = current.longTasks ?? [];
    pendingLongTasks.forEach((task) => {
      overrideUpdates[task.id] = task.postponedToDate ?? defaultPostponeDateKey;
      nextLongTasks = updateLongDailyTaskInCalendar(nextLongTasks, task, (item) => ({
        ...item,
        completed: false,
        taskStatus: "postponed",
        completedAt: null,
        postponedToDate: task.postponedToDate ?? defaultPostponeDateKey,
      }));
    });

    setPostponeDateOverrides((currentOverrides) => ({
      ...currentOverrides,
      ...overrideUpdates,
    }));

    showUndoToast({
      type: "postponeAllPending",
      message: "未達成を一括延期しました",
      taskTitle: `${pendingIds.size + pendingLongKeys.size}件のタスク`,
      previousTasks,
      previousLongTasks,
      previousWorkLogs,
    });

    return {
      ...current,
      tasks: nextTasks,
      longTasks: nextLongTasks,
      dailyRecords: syncCurrentDateRecords(current, nextTasks, nextLongTasks),
    };
  });
};


const handleMoveTaskToStatus = (taskOrId, nextStatus) => {
  if (isConfirmed) return;

  const task =
    typeof taskOrId === "object" && taskOrId !== null
      ? taskOrId
      : activeTasks.find((item) => String(item.id) === String(taskOrId));

  if (!task) return;

  const currentStatus = getReviewStatus(task);
  if (currentStatus === nextStatus) return;

  if (nextStatus === "pending") {
    moveTaskToPending(task);
    return;
  }

  if (nextStatus === "completed") {
    requestCompleteTask(task);
    return;
  }

  if (nextStatus === "postponed") {
    const nextDateKey = task.postponedToDate ?? defaultPostponeDateKey;

    setPostponeDateOverrides((current) => ({
      ...current,
      [task.id]: nextDateKey,
    }));

    postponeTask(task, nextDateKey);
  }
};

  const handleEditTask = (task) => {
    if (isConfirmed || isPostponed(task) || isLongDailyReviewTask(task)) return;
    setTodoModal({ open: true, mode: "edit", todo: task });
  };

  const handleDeleteTask = (task) => {
    if (isConfirmed || isLongDailyReviewTask(task)) return;

    const deletedLogs = (appData?.workLogs ?? []).filter((log) => log.taskId === task.id);

    setAppData((current) => {
      const withoutClone = removePostponedClone(current.tasks ?? [], task);
      const nextTasks = withoutClone.filter((item) => item.id !== task.id);
      return {
        ...current,
        tasks: nextTasks,
        workLogs: (current.workLogs ?? []).filter((log) => log.taskId !== task.id),
        dailyRecords: syncCurrentDateRecords(current, nextTasks),
      };
    });

    showUndoToast({ type: "delete", message: "削除しました", taskTitle: task.title, task, workLogs: deletedLogs });
  };

  const handleChangePostponeDate = (task, nextDateKey) => {
  if (isConfirmed || !nextDateKey) return;

  const minDateKey = getTomorrowKey(dateKey);
  const safeNextDateKey = nextDateKey < minDateKey ? minDateKey : nextDateKey;

  setPostponeDateOverrides((current) => ({
    ...current,
    [task.id]: safeNextDateKey,
  }));

  if (isLongDailyReviewTask(task)) {
    setLongReviewTaskStatus(task, "postponed", { postponedToDate: safeNextDateKey });
    return;
  }

  setAppData((current) => {
    const currentTask = (current.tasks ?? []).find((item) => item.id === task.id);
    if (!currentTask || !isPostponed(currentTask)) return current;

    const withoutOldClone = removePostponedClone(current.tasks ?? [], currentTask);

    const nextTasks = withoutOldClone.map((item) =>
      item.id === currentTask.id
        ? {
            ...item,
            postponedToDate: safeNextDateKey,
            postponedCloneId: null,
          }
        : item
    );

    return {
      ...current,
      tasks: nextTasks,
      dailyRecords: syncCurrentDateRecords(current, nextTasks),
    };
  });
};


  const handleSaveWorkLog = (log) => {
    if (isConfirmed) return;

    const seconds = log.seconds ?? log.minutes * 60;

    setAppData((current) => {
      const nextTasks = (current.tasks ?? []).map((task) =>
        task.id === log.taskId
          ? {
              ...task,
              actualMinutes: log.minutes,
              actualSeconds: seconds,
              workedMinutes: log.minutes,
              focusMinutes: log.minutes,
              elapsedMinutes: log.minutes,
              elapsedSeconds: seconds,
              completed: log.completeAfterSave ? true : task.completed,
              taskStatus: log.completeAfterSave ? "completed" : task.taskStatus ?? "pending",
              completedAt: log.completeAfterSave ? new Date().toISOString() : task.completedAt ?? null,
              postponedToDate: log.completeAfterSave ? null : task.postponedToDate ?? null,
              postponedCloneId: log.completeAfterSave ? null : task.postponedCloneId ?? null,
              ...preserveReviewTaskType(task),
            }
          : task
      );

      const targetTask = (current.tasks ?? []).find((task) => task.id === log.taskId);
      const nextTasksWithoutClone = log.completeAfterSave && targetTask ? removePostponedClone(nextTasks, targetTask) : nextTasks;

      const nextWorkLogs = [
        ...(current.workLogs ?? []).filter((item) => item.taskId !== log.taskId),
        { ...log, seconds, id: Date.now(), date: dateKey },
      ];

      return {
        ...current,
        tasks: nextTasksWithoutClone,
        workLogs: nextWorkLogs,
        dailyRecords: syncCurrentDateRecords(current, nextTasksWithoutClone),
      };
    });
  };

  const handleSaveTask = (updatedTask) => {
    if (isConfirmed) return;

    setAppData((current) => {
      const nextTasks = (current.tasks ?? []).map((item) =>
        item.id === updatedTask.id
          ? {
              ...item,
              ...updatedTask,
              ...preserveReviewTaskType(item),
              targetDate: updatedTask.targetDate ?? getTaskDateKey(item, dateKey),
              createdDate: updatedTask.createdDate ?? item.createdDate ?? getTaskDateKey(item, dateKey),
              actualSeconds: updatedTask.actualSeconds ?? (Number(updatedTask.actualMinutes) || 0) * 60,
              workedMinutes: updatedTask.workedMinutes ?? updatedTask.actualMinutes ?? item.workedMinutes ?? 0,
              focusMinutes: updatedTask.focusMinutes ?? updatedTask.actualMinutes ?? item.focusMinutes ?? 0,
              elapsedMinutes: updatedTask.elapsedMinutes ?? updatedTask.actualMinutes ?? item.elapsedMinutes ?? 0,
              elapsedSeconds: updatedTask.elapsedSeconds ?? updatedTask.actualSeconds ?? (Number(updatedTask.actualMinutes) || 0) * 60,
            }
          : item
      );
      return { ...current, tasks: nextTasks, dailyRecords: syncCurrentDateRecords(current, nextTasks) };
    });

    setTodoModal({ open: false, mode: "edit", todo: null });
  };

  const undoLastAction = () => {
  if (!undoToast) return;

  if (undoToast.type === "delete") {
    setAppData((current) => {
      const exists = (current.tasks ?? []).some((task) => task.id === undoToast.task.id);
      const nextTasks = exists ? current.tasks ?? [] : [...(current.tasks ?? []), undoToast.task];
      const restoredLogs = undoToast.workLogs ?? [];
      const restoredIds = new Set(restoredLogs.map((log) => log.id));
      const nextWorkLogs = [
        ...(current.workLogs ?? []).filter((log) => !restoredIds.has(log.id)),
        ...restoredLogs,
      ];

      return {
        ...current,
        tasks: nextTasks,
        workLogs: nextWorkLogs,
        dailyRecords: syncCurrentDateRecords(current, nextTasks),
      };
    });
  }

  if (undoToast.type === "postponeAllPending") {
    setAppData((current) => {
      const previousTasks = undoToast.previousTasks ?? [];
      const previousTaskById = new Map(previousTasks.map((task) => [task.id, task]));
      const previousIds = new Set(previousTasks.map((task) => task.id));

      const nextTasks = (current.tasks ?? []).map((task) =>
        previousTaskById.has(task.id)
          ? previousTaskById.get(task.id)
          : task
      );

      const restoredLogs = undoToast.previousWorkLogs ?? [];
      const restoredTaskIds = new Set(restoredLogs.map((log) => log.taskId));

      const nextWorkLogs = [
        ...(current.workLogs ?? []).filter((log) => !previousIds.has(log.taskId) && !restoredTaskIds.has(log.taskId)),
        ...restoredLogs,
      ];

      setPostponeDateOverrides((currentOverrides) => {
        const next = { ...currentOverrides };
        previousIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });

      const nextLongTasks = undoToast?.previousLongTasks ?? current.longTasks ?? [];

      return {
        ...current,
        tasks: nextTasks,
        longTasks: nextLongTasks,
        workLogs: nextWorkLogs,
        dailyRecords: syncCurrentDateRecords(current, nextTasks, nextLongTasks),
      };
    });
  }

  setUndoToast(null);
  if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
};

  const confirmReview = () => {
  if (!canConfirm) return;

  setAppData((current) => {
    const currentDateTasks = (current.tasks ?? []).filter(
      (task) => getTaskDateKey(task, dateKey) === dateKey
    );

    const postponedTasks = currentDateTasks.filter(
      (task) => isPostponed(task) && !isLongDailyReviewTask(task)
    );

    const cloneSourceIds = new Set(postponedTasks.map((task) => String(task.id)));

    const withoutOldClones = (current.tasks ?? []).filter(
      (task) => !(task.postponedFromDate === dateKey && cloneSourceIds.has(String(task.originalTaskId)))
    );

    const clones = postponedTasks.map((task) => {
      const postponeDateKey = task.postponedToDate ?? defaultPostponeDateKey;
      const cloneId = `${task.id}-postponed-${postponeDateKey}-${Date.now()}`;
      return createPostponedClone(task, postponeDateKey, cloneId);
    });

    const tasksWithCloneIds = withoutOldClones.map((task) => {
      const matched = clones.find((clone) => String(clone.originalTaskId) === String(task.id));
      return matched ? { ...task, postponedCloneId: matched.id, postponedToDate: matched.targetDate } : task;
    });

    const nextTasks = [...tasksWithCloneIds, ...clones];
    const currentReviewTasks = buildReviewTasksForDate(nextTasks, current.longTasks ?? [], dateKey);

    const nextLongTasks = applyLongTaskReviewToCalendar(
      current.longTasks ?? [],
      currentReviewTasks,
      dateKey
    );

    const nextDailyRecords = syncDailyRecordFromTasks(
      current.dailyRecords ?? {},
      dateKey,
      buildReviewTasksForDate(nextTasks, nextLongTasks, dateKey)
    );

    return {
      ...current,
      tasks: nextTasks,
      longTasks: nextLongTasks,
      dailyRecords: confirmDailyRecord(nextDailyRecords, dateKey, { reflectionText }),
    };
  });
};

  const unconfirmReview = () => {
  setAppData((current) => {
    const nextTasks = (current.tasks ?? [])
      .filter((task) => task.postponedFromDate !== dateKey)
      .map((task) =>
        getTaskDateKey(task, dateKey) === dateKey
          ? {
              ...task,
              postponedCloneId: null,
            }
          : task
      );

    const currentDateTasks = nextTasks.filter(
      (task) => getTaskDateKey(task, dateKey) === dateKey
    );

    const nextLongTasks = revertLongTaskReviewFromCalendar(current.longTasks ?? [], dateKey);

    const syncedRecords = syncDailyRecordFromTasks(
      current.dailyRecords ?? {},
      dateKey,
      buildReviewTasksForDate(nextTasks, nextLongTasks, dateKey)
    );

    return {
      ...current,
      tasks: nextTasks,
      longTasks: nextLongTasks,
      dailyRecords: unconfirmDailyRecord(syncedRecords, dateKey),
    };
  });
};

  const targetWorkLog = workLogModal.task
    ? (appData?.workLogs ?? []).find((log) => log.taskId === workLogModal.task.id)
    : null;

  return (
    <div className="min-h-dvh bg-[#f6f8f7] text-slate-950 antialiased">
      <main className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#fbfcfb] px-[max(12px,env(safe-area-inset-left))] pb-[calc(82px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <AppHeader title={formatJapaneseDate(dateKey)} leftType="back" rightType="none" onBack={() => onNavigate?.("today")} />

        <div className="space-y-2.5 min-[390px]:space-y-3">
          <SummaryCard record={displayRecord} />

          {isAutoCompletedEmptyDay && (
            <div className="rounded-[20px] bg-emerald-50 px-4 py-3 text-[13px] font-black leading-5 text-emerald-700">
              この日は記録されたTodoがないため、振り返りは自動で完了しました。
            </div>
          )}

          {!isAutoCompletedEmptyDay && isConfirmed && (
            <div className="rounded-[20px] bg-emerald-50 px-4 py-3 text-[13px] font-black leading-5 text-emerald-700">
              {formatJapaneseDate(dateKey)}の振り返りは完了しました。
            </div>
          )}

    

          {!isConfirmed && incompleteTasks.length === 0 && !isAutoCompletedEmptyDay && (
            <div className="rounded-[20px] bg-emerald-50 px-4 py-3 text-[13px] font-bold leading-5 text-emerald-700">
              すべてのタスクが分類済みです。振り返りを完了できます。
            </div>
          )}

          <TaskSection
  record={{
    ...displayRecord,
    tasks: reviewTasks,
  }}
  disabled={isConfirmed}
  onEditTask={handleEditTask}
  onDeleteTask={handleDeleteTask}
onMoveTaskToStatus={handleMoveTaskToStatus}
moveTaskToPending={moveTaskToPending}
requestCompleteTask={requestCompleteTask}
  onChangePostponeDate={handleChangePostponeDate}
  onPostponeAllPending={handlePostponeAllPending}
  postponeDateOverrides={postponeDateOverrides}
  baseDateKey={dateKey}
/>

          {!isAutoCompletedEmptyDay && (
            <ReflectionSection
              reflectionText={reflectionText}
              setReflectionText={setReflectionText}
              disabled={isConfirmed}
            />
          )}
        </div>

{!isAutoCompletedEmptyDay && (
        <button
  type="button"
  disabled={!isConfirmed && !canConfirm}
  onClick={(event) => {
  event.preventDefault();
  event.stopPropagation();

  if (isConfirmed) {
    unconfirmReview();
  } else {
    confirmReview();
  }
}}
  className={`fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-1/2 z-30 flex h-[52px] w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 items-center justify-center gap-2 rounded-[20px] text-[17px] font-black active:scale-[0.985] ${
    isConfirmed
      ? "bg-slate-100 text-slate-500 shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
      : canConfirm
        ? "bg-emerald-500 text-white shadow-[0_14px_26px_rgba(16,185,129,0.28)]"
        : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
  }`}
>
  {isConfirmed ? (
    <RotateCcw className="h-5 w-5" strokeWidth={2.8} />
  ) : (
    <Check className="h-5 w-5" strokeWidth={2.8} />
  )}

  {isConfirmed
    ? "振り返り完了を解除する"
    : canConfirm
      ? "今日の振り返りを完了する"
      : "未達成タスクを分類してください"}
</button>
)}
      </main>

      <TodoModal
        open={todoModal.open}
        mode={todoModal.mode}
        initialTodo={todoModal.todo}
        categories={appData?.categories ?? initialCategories}
        onClose={() => setTodoModal({ open: false, mode: "edit", todo: null })}
        onSave={handleSaveTask}
        onAddCategory={(category) => {
          setAppData((current) => ({
            ...current,
            categories: (current.categories ?? initialCategories).includes(category)
              ? current.categories ?? initialCategories
              : [...(current.categories ?? initialCategories), category],
          }));
        }}
        onDeleteCategory={(category) => {
          if (category === "その他") return;
          setAppData((current) => ({
            ...current,
            categories: (current.categories ?? initialCategories).filter((item) => item !== category),
            tasks: (current.tasks ?? []).map((task) => (task.category === category ? { ...task, category: "その他" } : task)),
          }));
        }}
      />

      <WorkLogModal
        open={workLogModal.open}
        targetTask={workLogModal.task}
        targetWorkLog={targetWorkLog}
        completeAfterSave={workLogModal.completeAfterSave}
        onClose={() => setWorkLogModal({ open: false, task: null, completeAfterSave: false })}
        onSave={handleSaveWorkLog}
      />


      <UndoToast
        toast={undoToast}
        onUndo={undoLastAction}
        onClose={() => setUndoToast(null)}
      />
    </div>
  );
}
