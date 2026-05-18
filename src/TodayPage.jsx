import React, { useEffect, useMemo, useRef, useState } from "react";
import mountainImage from "./assets/mountain.png";
import TodoModal from "./components/TodoModal";
import BottomNav from "./components/BottomNav";
import AppHeader from "./components/AppHeader";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  GripVertical,
  Pencil,
  Play,
  Plus,
  Bell,
  RotateCcw,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import {
  getOrCreateDailyRecord,
  syncDailyRecordFromTasks,
} from "./utils/dailyRecords";

const defaultCategoryStyles = {
  学習: { icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-50" },
  仕事: { icon: Briefcase, color: "text-blue-500", bg: "bg-blue-50" },
  健康: { icon: Dumbbell, color: "text-violet-500", bg: "bg-violet-50" },
  その他: { icon: CalendarDays, color: "text-slate-500", bg: "bg-slate-50" },
};

const priorityStyles = {
  high: {
    label: "高",
    fullLabel: "高（HIGH）",
    text: "text-red-500",
    badge: "bg-red-500 text-white",
    border: "border-red-100",
    bg: "bg-red-50/70",
    line: "bg-red-400",
    number: "border-red-200 bg-red-50 text-red-500",
    empty: "高い重要度のタスクはありません",
  },
  medium: {
    label: "中",
    fullLabel: "中（MEDIUM）",
    text: "text-amber-500",
    badge: "bg-amber-500 text-white",
    border: "border-amber-100",
    bg: "bg-amber-50/70",
    line: "bg-amber-400",
    number: "border-amber-200 bg-amber-50 text-amber-500",
    empty: "中くらいの重要度のタスクはありません",
  },
  low: {
    label: "低",
    fullLabel: "低（LOW）",
    text: "text-slate-500",
    badge: "bg-slate-400 text-white",
    border: "border-slate-100",
    bg: "bg-slate-50/80",
    line: "bg-slate-300",
    number: "border-slate-200 bg-slate-50 text-slate-500",
    empty: "低い重要度のタスクはありません",
  },
  reminder: {
    label: "リマインダ",
    fullLabel: "リマインダ",
    text: "text-violet-500",
    badge: "bg-violet-500 text-white",
    border: "border-violet-100",
    bg: "bg-violet-50/70",
    line: "bg-violet-400",
    number: "border-violet-200 bg-violet-50 text-violet-500",
    empty: "リマインダはありません",
  },
};

const priorityOrder = ["high", "medium", "low", "reminder"];
const editablePriorityOrder = ["high", "medium", "low"];

const initialCategories = ["学習", "仕事", "健康", "その他"];
const initialTodos = [];
const initialWorkLogs = [];

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayKey() {
  return formatDateForInput(new Date());
}

function addDaysToDateKey(dateKey, diffDays) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + diffDays);
  return formatDateForInput(date);
}

function formatMinutes(totalMinutes) {
  const h = Math.floor((Number(totalMinutes) || 0) / 60);
  const m = (Number(totalMinutes) || 0) % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function formatShortMinutes(totalMinutes) {
  const h = Math.floor((Number(totalMinutes) || 0) / 60);
  const m = (Number(totalMinutes) || 0) % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDateForHeader(date) {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function formatDateForTodo(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  return formatDateForHeader(new Date(year, month - 1, day));
}

function getTodoDateKey(todo) {
  return (
    todo?.targetDate ??
    todo?.date ??
    todo?.createdDate ??
    todo?.schedule?.date ??
    todo?.reminder?.date ??
    getTodayKey()
  );
}

function getCategoryStyle(category) {
  return defaultCategoryStyles[category] ?? defaultCategoryStyles["その他"];
}

function isReminder(todo) {
  return (
    todo?.type === "reminder" ||
    todo?.priority === "reminder" ||
    Boolean(todo?.reminder)
  );
}

function getPriority(todo) {
  if (isReminder(todo)) return "reminder";
  return editablePriorityOrder.includes(todo?.priority) ? todo.priority : "medium";
}

function getRank(todo, fallback = 9999) {
  const rank = Number(todo?.rank);
  return Number.isFinite(rank) && rank > 0 ? rank : fallback;
}

function getReminderTime(todo) {
  return todo?.reminder?.time ?? todo?.schedule?.time ?? "99:99";
}

function isCompleted(todo) {
  return todo?.completed === true || todo?.taskStatus === "completed";
}

function getReminderLabel(todo) {
  const lead = todo?.reminder?.reminderLead ?? todo?.schedule?.reminderLead;
  if (lead === "0") return "指定時刻にリマインド";
  if (lead === "5") return "5分前にリマインド";
  if (lead === "10") return "10分前にリマインド";
  if (lead === "30") return "30分前にリマインド";
  if (lead === "60") return "1時間前にリマインド";
  if (lead === "1440") return "1日前にリマインド";
  return "リマインド予定";
}

function getInitialActualMinutes(todo, workLog) {
  const candidates = [
    workLog?.minutes,
    todo?.actualMinutes,
    todo?.workedMinutes,
    todo?.focusMinutes,
    todo?.elapsedMinutes,
    todo?.estimatedMinutes,
    15,
  ];

  const found = candidates.find((value) => Number(value) > 0);
  return Number(found ?? 15);
}

function sortByRank(todos) {
  return [...todos].sort((a, b) => {
    const rankDiff = getRank(a) - getRank(b);
    if (rankDiff !== 0) return rankDiff;
    return Number(a.id ?? 0) - Number(b.id ?? 0);
  });
}

function Header({ selectedDate, onChangeDate }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    if (!calendarOpen) return;

    const handleClickOutside = (event) => {
      if (calendarRef.current?.contains(event.target)) return;
      setCalendarOpen(false);
    };

    window.addEventListener("pointerdown", handleClickOutside);
    return () => window.removeEventListener("pointerdown", handleClickOutside);
  }, [calendarOpen]);

  const moveDate = (diffDays) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + diffDays);
    onChangeDate(nextDate);
  };

  const handleDateChange = (event) => {
    const value = event.target.value;
    if (!value) return;
    const [year, month, day] = value.split("-").map(Number);
    onChangeDate(new Date(year, month - 1, day));
    setCalendarOpen(false);
  };

  return (
    <div className="relative">
      <AppHeader
        title={formatDateForHeader(selectedDate)}
        leftType="menu"
        rightType="bell"
        onPrev={() => moveDate(-1)}
        onNext={() => moveDate(1)}
        onTitleClick={() => setCalendarOpen((current) => !current)}
      />

      {calendarOpen && (
        <div
          ref={calendarRef}
          onPointerDown={(event) => event.stopPropagation()}
          className="fixed left-1/2 top-[calc(92px+env(safe-area-inset-top))] z-50 box-border w-[calc(100vw-64px)] max-w-[300px] min-w-0 -translate-x-1/2 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
        >
          <p className="mb-3 text-center text-sm font-black text-slate-700">
            日付を選択
          </p>
          <input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={handleDateChange}
            className="block h-12 w-full min-w-0 max-w-full appearance-none rounded-2xl border border-slate-200 px-2 text-center text-[15px] font-extrabold leading-[48px] text-slate-900 outline-none focus:border-emerald-400"
          />
          <button
            type="button"
            onClick={() => {
              onChangeDate(new Date());
              setCalendarOpen(false);
            }}
            className="mt-3 h-11 w-full rounded-2xl bg-emerald-50 text-sm font-black text-emerald-600 active:scale-[0.99]"
          >
            今日に戻る
          </button>
        </div>
      )}
    </div>
  );
}

function TodayGoalCard({
  totalCount,
  incompleteCount,
  selectedTask,
  onStartTimer,
  isReviewConfirmed = false,
  isPastDate = false,
  isFutureDate = false,
}) {
  const selectedIsReminder = isReminder(selectedTask);
  const canStartTimer =
    selectedTask &&
    !selectedIsReminder &&
    !isReviewConfirmed &&
    !isPastDate &&
    !isFutureDate;

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-emerald-100/70 bg-white p-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(187,247,208,0.55),transparent_38%),linear-gradient(135deg,rgba(240,253,244,0.9),white_58%)]" />

      <img
        src={mountainImage}
        alt="山のイラスト"
        className="pointer-events-none absolute right-0 top-6 z-0 h-[116px] w-[132px] object-contain opacity-95 min-[390px]:h-[128px] min-[390px]:w-[146px]"
      />

      <div className="relative z-10 min-h-[104px] pr-[104px] min-[390px]:pr-[116px]">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-amber-100 text-[13px]">
            ☀️
          </span>
          {selectedTask ? "選択中のタスク" : "今日の目標"}
        </div>

        {isPastDate && isReviewConfirmed && totalCount === 0 ? (
          <>
            <h1 className="mb-2 text-[21px] font-black leading-[1.15] tracking-[-0.045em] text-slate-950 min-[390px]:text-[23px]">
              この日は記録されたTodoがありません
            </h1>
          </>
        ) : isPastDate && isReviewConfirmed ? (
          <>
            <h1 className="mb-2 text-[21px] font-black leading-[1.15] tracking-[-0.045em] text-slate-950 min-[390px]:text-[23px]">
              この日の振り返りは完了しました
            </h1>
            <p className="text-[12px] font-bold leading-relaxed text-slate-400">
              過去日のため、閲覧のみできます。
            </p>
          </>
        ) : isPastDate ? (
          <>
            <h1 className="mb-2 text-[21px] font-black leading-[1.15] tracking-[-0.045em] text-slate-950 min-[390px]:text-[23px]">
              この日は振り返りが未完了です
            </h1>
            <p className="text-[12px] font-bold leading-relaxed text-amber-600">
              詳細を見るから未達成タスクを整理してください。
            </p>
          </>
        ) : isFutureDate ? (
          <>
            <h1 className="mb-2 text-[21px] font-black leading-[1.15] tracking-[-0.045em] text-slate-950 min-[390px]:text-[23px]">
              未来日のTodoを準備中
            </h1>
            <p className="text-[12px] font-bold leading-relaxed text-slate-400">
              追加・編集はできます。実行と達成は当日にできます。
            </p>
          </>
        ) : isReviewConfirmed && totalCount > 0 ? (
          <>
            <h1 className="mb-2 text-[21px] font-black leading-[1.15] tracking-[-0.045em] text-slate-950 min-[390px]:text-[23px]">
              今日のタスクは完了しました！
            </h1>
            <p className="text-[12px] font-bold leading-relaxed text-slate-400">
              新しいTodoを追加すると、振り返り完了は解除されます。
            </p>
          </>
        ) : selectedTask ? (
          <>
            <h1 className="mb-1.5 line-clamp-2 text-[20px] font-black leading-[1.15] tracking-[-0.045em] text-slate-950 min-[390px]:text-[22px]">
              {selectedTask.title}
            </h1>

            {!selectedIsReminder && (
              <p className="mb-0.5 text-[12px] font-bold text-slate-400">
                {selectedTask.category}
{Number(selectedTask.estimatedMinutes) > 0 && (
  <>・予定 {formatMinutes(selectedTask.estimatedMinutes)}</>
)}
              </p>
            )}

            <p className="text-[12px] font-bold leading-relaxed text-emerald-600">
              {selectedIsReminder
                ? getReminderLabel(selectedTask)
                : "このタスクを開始できます。"}
            </p>
          </>
        ) : totalCount === 0 ? (
          <>
            <h1 className="mb-2 text-[21px] font-black leading-[1.15] tracking-[-0.045em] text-slate-950 min-[390px]:text-[23px]">
              まずはTodoを1つ追加しよう
            </h1>
            <p className="text-[12px] font-bold leading-relaxed text-slate-400">
              今日やることを追加すると、ここから集中を始められます。
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-[21px] font-black leading-[1.15] tracking-[-0.045em] text-slate-950 min-[390px]:text-[23px]">
              {incompleteCount > 0
                ? `${incompleteCount}つのタスクを完了しよう！`
                : "今日のタスクは完了！"}
            </h1>
            <p className="text-[12px] font-bold leading-relaxed text-slate-400">
              タスクを選ぶとタイマーを開始できます。
            </p>
          </>
        )}
      </div>

      <button
        onClick={canStartTimer ? onStartTimer : undefined}
        disabled={!canStartTimer}
        className={`relative z-10 mt-1.5 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] text-[14px] font-black active:scale-[0.985] min-[390px]:h-12 min-[390px]:text-[15px] ${
          canStartTimer
            ? "bg-emerald-500 text-white shadow-[0_12px_22px_rgba(16,185,129,0.26)]"
            : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
        }`}
      >
        <Play className="h-5 w-5 fill-current" />
        {isPastDate
          ? "過去日は操作できません"
          : isFutureDate
            ? "未来日は開始できません"
            : isReviewConfirmed && totalCount > 0
              ? "振り返りは完了済みです"
              : selectedTask
                ? selectedIsReminder
                  ? `${selectedTask.reminder?.time ?? selectedTask.schedule?.time ?? ""}予定`
                  : "このタスクで集中開始"
                : "タスクを選択してください"}
      </button>
    </section>
  );
}

function SortModeSwitch({ sortMode, onChange, showAllTasks, onToggleShowAll }) {
  return (
    <section className="grid grid-cols-[1fr_auto] items-center gap-3">
      <div className="grid grid-cols-2 gap-1.5 rounded-full border border-slate-200 bg-white p-1 shadow-[0_8px_18px_rgba(15,23,42,0.045)]">
        <button
          type="button"
          onClick={() => onChange("priority")}
          className={`h-8 rounded-full px-3 text-[12px] font-black active:scale-[0.98] ${
            sortMode === "priority"
              ? "bg-emerald-500 text-white shadow-[0_6px_12px_rgba(16,185,129,0.20)]"
              : "text-slate-500"
          }`}
        >
          重要度
        </button>

        <button
          type="button"
          onClick={() => onChange("category")}
          className={`h-8 rounded-full px-3 text-[12px] font-black active:scale-[0.98] ${
            sortMode === "category"
              ? "bg-emerald-500 text-white shadow-[0_6px_12px_rgba(16,185,129,0.20)]"
              : "text-slate-500"
          }`}
        >
          カテゴリ
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleShowAll}
        className="flex h-10 shrink-0 items-center gap-2 rounded-full px-1 active:scale-[0.98]"
      >
        <span className="text-[13px] font-black text-slate-700">全表示</span>

        <span
          className={`relative block h-8 w-14 rounded-full transition-colors ${
            showAllTasks ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute left-1 top-1 block h-6 w-6 rounded-full bg-white shadow transition-transform ${
              showAllTasks ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </span>
      </button>
    </section>
  );
}

function FloatingAddButton({ show, onClick }) {
  if (!show) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-[calc(94px+env(safe-area-inset-bottom))] right-[max(18px,env(safe-area-inset-right))] z-40 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_14px_30px_rgba(16,185,129,0.32)] active:scale-[0.96]"
    >
      <Plus className="h-8 w-8" strokeWidth={2.5} />
    </button>
  );
}

function TodoItem({
  todo,
  displayRank,
  sortMode,
  canSelect = true,
  canComplete = true,
  canEdit = true,
  canDelete = true,
  canMoveTomorrow = true,
  canReorder = true,
  selected,
  menuOpen,
  dragging,
  dragOffsetY,
  dropTarget,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onMoveTomorrow,
  onWorkLogEdit,
  onToggleMenu,
  onDragHandlePointerDown,
  onTaskLongPressPointerDown,
}) {
  const config = getCategoryStyle(todo.category);
  const priority = getPriority(todo);
  const priorityConfig = priorityStyles[priority] ?? priorityStyles.medium;

  const categoryNumberClass =
    todo.category === "学習"
      ? "border-emerald-200 bg-emerald-50 text-emerald-500"
      : todo.category === "仕事"
        ? "border-blue-200 bg-blue-50 text-blue-500"
        : todo.category === "健康"
          ? "border-violet-200 bg-violet-50 text-violet-500"
          : "border-slate-200 bg-slate-50 text-slate-500";

  const Icon = config.icon;
  const reminder = isReminder(todo);

  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartRef = useRef({ x: 0, y: 0 });
  const swipeActiveRef = useRef(false);
  const swipeLatestXRef = useRef(0);
  const swipeFrameRef = useRef(null);
  const swipePointerIdRef = useRef(null);

  const completeDisabled = !canComplete;
  const itemDisabled = !canSelect && !canEdit && !canDelete && !canMoveTomorrow;

  const startSwipe = (event) => {
    if (dragging || itemDisabled || isCompleted(todo)) return;
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

if (!isSwiping) {
  setIsSwiping(true);
}

const limited = Math.max(-118, Math.min(118, dx));
    swipeLatestXRef.current = limited;

    if (swipeFrameRef.current) return;

    swipeFrameRef.current = requestAnimationFrame(() => {
      setSwipeX(swipeLatestXRef.current);
      swipeFrameRef.current = null;
    });
  };

  const cancelSwipe = (event) => {
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

    const deleteThreshold = 100;
const moveTomorrowThreshold = 104;

    if (finalX < -deleteThreshold && canDelete) {
      onDelete(todo);
      return;
    }

    if (finalX > moveTomorrowThreshold && canMoveTomorrow) {
      onMoveTomorrow(todo);
    }
  };

  return (
    <div
      data-todo-id={todo.id}
      className={`relative overflow-visible border-b border-slate-100 last:border-b-0 ${
        dragging ? "z-[999]" : menuOpen ? "z-50" : "z-0"
      } ${selected ? "bg-emerald-50/70" : "bg-white"} ${
        dropTarget && !dragging ? "bg-slate-50" : ""
      }`}
    >
      {!dragging && !isCompleted(todo) && canMoveTomorrow && (
        <div className="absolute inset-y-0 left-0 z-0 flex w-32 items-center justify-start bg-amber-50 px-4 text-amber-600">
          <span className="text-xs font-black">明日へ</span>
        </div>
      )}

      {!dragging && !isCompleted(todo) && canDelete && (
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
        onClick={(event) => {
          if (event.defaultPrevented || dragging || itemDisabled || isSwiping) return;
          if (!canSelect) return;
          onSelect(todo);
        }}
        style={
          dragging
            ? {
                transform: `translate3d(0, ${dragOffsetY}px, 0) scale(1.015)`,
              }
            : swipeX !== 0
              ? {
                  transform: `translate3d(${swipeX}px, 0, 0)`,
                }
              : undefined
        }
        className={`relative z-10 px-3 py-2 transition-transform ${
  dragging
    ? "pointer-events-none z-[1000] rounded-[16px] bg-white opacity-95 shadow-[0_18px_40px_rgba(15,23,42,0.20)] ring-1 ring-slate-200 duration-100"
    : "bg-white duration-200"
} ${itemDisabled ? "cursor-default opacity-80" : "cursor-pointer"}`}
      >
        <div className="flex min-h-[48px] items-center gap-2">
          {!reminder && (
  <button
    type="button"
    aria-label="順番を並び替え"
    disabled={!canReorder}
    onClick={(event) => event.stopPropagation()}
    onPointerDown={(event) => {
      if (!canReorder) return;
      onDragHandlePointerDown(event, todo.id);
    }}
    className={`flex h-10 w-9 shrink-0 touch-none select-none flex-col items-center justify-center rounded-2xl border transition-all ${
      !canReorder
        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-200"
        : dragging
          ? "border-slate-900 bg-slate-900 text-white shadow-[0_6px_14px_rgba(15,23,42,0.16)]"
          : sortMode === "category"
            ? categoryNumberClass
            : priorityConfig.number
    }`}
  >
    <span className="text-[14px] font-black leading-none">
      {displayRank}
    </span>

    <GripVertical
      className={`mt-0.5 h-3 w-3 transition-transform ${
        dragging ? "scale-110" : "scale-100"
      }`}
    />
  </button>
)}

          <button
            disabled={completeDisabled}
            onClick={(event) => {
              event.stopPropagation();
              if (completeDisabled) return;
              onToggle(todo.id);
            }}
            className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-[1.6px] ${
              isCompleted(todo)
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-300 bg-white text-transparent"
            } ${completeDisabled ? "cursor-not-allowed opacity-45" : ""}`}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </button>

          <div className="min-w-0 flex-1 touch-manipulation select-none">
            <p
              className={`flex items-start gap-1 text-[13px] font-bold leading-tight tracking-[-0.01em] ${
                isCompleted(todo) ? "text-slate-400" : "text-slate-950"
              }`}
            >
              {reminder && (
                <Bell className="mt-[1px] h-3.5 w-3.5 shrink-0 text-amber-500" />
              )}

              <span className="line-clamp-2 break-words">{todo.title}</span>
            </p>

            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {todo.schedule && (
                <p className="truncate text-[10.5px] font-bold text-slate-400">
                  {formatDateForTodo(todo.schedule.date)} {todo.schedule.time} 開始
                </p>
              )}

              <div className={`flex items-center gap-1 ${config.color}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                <span className="max-w-[52px] truncate text-[11px] font-black">
                  {todo.category}
                </span>
              </div>

              {(reminder || Number(todo.estimatedMinutes) > 0) && (
  <div className="flex items-center gap-1 text-slate-400">
    <Clock className="h-3.5 w-3.5" strokeWidth={2.2} />
    <span className="text-[11px] font-bold">
      {reminder
        ? `${todo.reminder?.time ?? todo.schedule?.time ?? ""}`
        : formatMinutes(todo.estimatedMinutes)}
    </span>
  </div>
)}
            </div>
          </div>

          <button
            type="button"
            disabled={!canEdit}
            onClick={(event) => {
              event.stopPropagation();
              if (!canEdit) return;
              onEdit(todo);
            }}
            className={`grid h-8 w-7 shrink-0 place-items-center rounded-xl ${
              !canEdit
                ? "cursor-not-allowed text-slate-200"
                : "text-emerald-500 active:bg-emerald-50"
            }`}
          >
            <Pencil className="h-[17px] w-[17px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label, count, type, groupKey }) {
  const priorityConfig = priorityStyles[groupKey] ?? priorityStyles.medium;

  if (type === "priority") {
    return (
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <p className={`text-[14px] font-black ${priorityConfig.text}`}>
          {label}
        </p>
        <span
          className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-black ${priorityConfig.badge}`}
        >
          {count}
        </span>
      </div>
    );
  }

  const categoryStyle = getCategoryStyle(groupKey);
  const Icon = categoryStyle.icon;

  return (
    <div className="mb-1.5 flex items-center gap-2 px-1">
      <div className={`grid h-6 w-6 place-items-center rounded-xl ${categoryStyle.bg}`}>
        <Icon className={`h-4 w-4 ${categoryStyle.color}`} strokeWidth={2.3} />
      </div>
      <p className="text-[14px] font-black text-slate-800">{label}</p>
      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-slate-100 px-1.5 text-[11px] font-black text-slate-500">
        {count}
      </span>
    </div>
  );
}

function TodoSection({
  section,
  sortMode,
  collapsed,
  onToggleCollapse,
  selectedTaskId,
  canSelect,
  canComplete,
  canEdit,
  canDelete,
  canMoveTomorrow,
  canReorder,
  openMenuId,
  setOpenMenuId,
  draggingId,
  dragOffsetY,
  dropTargetId,
  dropTargetGroup,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onMoveTomorrow,
  onWorkLogEdit,
  onDragHandlePointerDown,
  onTaskLongPressPointerDown,
}) {
  const isEmpty = section.todos.length === 0;
  const priorityConfig = priorityStyles[section.key] ?? priorityStyles.medium;

  return (
    <div
      data-drop-section={section.key}
      className={`rounded-[20px] border ${
        sortMode === "priority" ? priorityConfig.border : "border-slate-100"
      } ${sortMode === "priority" ? priorityConfig.bg : "bg-white"} p-2`}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="mb-1.5 flex w-full items-center justify-between rounded-2xl px-1 py-1 active:bg-slate-50"
      >
        <SectionHeader
          label={section.label}
          count={section.todos.length}
          type={sortMode}
          groupKey={section.key}
        />

        <span className="text-[13px] font-black text-slate-400">
          {collapsed ? "開く" : "閉じる"}
        </span>
      </button>

      {!collapsed && (
        <div
          className={`overflow-visible rounded-[16px] bg-white ${
            dropTargetGroup === section.key && !dropTargetId
              ? "ring-2 ring-emerald-200"
              : ""
          }`}
        >
          {isEmpty ? (
            <div className="rounded-[16px] bg-white/75 px-4 py-4 text-center text-[12px] font-bold text-slate-400">
              表示するTodoはありません
            </div>
          ) : (
            section.todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                sortMode={sortMode}
                displayRank={todo.displayRank}
                canSelect={canSelect}
                canComplete={canComplete}
                canEdit={canEdit}
                canDelete={canDelete}
                canMoveTomorrow={canMoveTomorrow}
                canReorder={canReorder && !isReminder(todo)}
                selected={selectedTaskId === todo.id}
                menuOpen={openMenuId === todo.id}
                dragging={draggingId === todo.id}
                dragOffsetY={draggingId === todo.id ? dragOffsetY : 0}
                dropTarget={dropTargetId === todo.id}
                onSelect={onSelect}
                onToggle={onToggle}
                onEdit={(target) => {
                  setOpenMenuId(null);
                  onEdit(target);
                }}
                onDelete={(target) => {
                  setOpenMenuId(null);
                  onDelete(target);
                }}
                onMoveTomorrow={(target) => {
                  setOpenMenuId(null);
                  onMoveTomorrow(target);
                }}
                onWorkLogEdit={(target) => {
                  setOpenMenuId(null);
                  onWorkLogEdit(target);
                }}
                onToggleMenu={(id) =>
                  setOpenMenuId((current) => (current === id ? null : id))
                }
                onDragHandlePointerDown={onDragHandlePointerDown}
                onTaskLongPressPointerDown={onTaskLongPressPointerDown}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TodoListCard({
  todos,
  categories,
  showAllTasks,
  sortMode,
  selectedTaskId,
  canSelect,
  canComplete,
  canEdit,
  canDelete,
  canMoveTomorrow,
  canReorder,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onMoveTomorrow,
  onWorkLogEdit,
  onReorder,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openSectionKeys, setOpenSectionKeys] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [dropTargetGroup, setDropTargetGroup] = useState(null);
  const draggingIdRef = useRef(null);
  const startYRef = useRef(0);
  const pendingDropRef = useRef({
    targetId: null,
    targetGroup: null,
    visibleOrderIds: [],
  });
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef({ x: 0, y: 0, id: null });
  const previousBodyTouchActionRef = useRef("");
  const previousBodyUserSelectRef = useRef("");

  const rankedTodos = useMemo(() => {
    const categoryIndex = (category) => {
      const index = categories.indexOf(category ?? "その他");
      return index >= 0 ? index : categories.length;
    };

    const displaySorted = [...todos].sort((a, b) => {
      if (sortMode === "category") {
        const categoryDiff =
          categoryIndex(a.category) - categoryIndex(b.category);

        if (categoryDiff !== 0) return categoryDiff;
      }

      const priorityDiff =
        priorityOrder.indexOf(getPriority(a)) -
        priorityOrder.indexOf(getPriority(b));

      if (priorityDiff !== 0) return priorityDiff;

      if (getPriority(a) === "reminder") {
        const timeDiff = getReminderTime(a).localeCompare(getReminderTime(b));
        if (timeDiff !== 0) return timeDiff;
      }

      const rankDiff = getRank(a) - getRank(b);
      if (rankDiff !== 0) return rankDiff;

      return Number(a.id ?? 0) - Number(b.id ?? 0);
    });

    return displaySorted.map((todo, index) => ({
      ...todo,
      displayRank: index + 1,
    }));
  }, [todos, sortMode, categories]);

  const sections = useMemo(() => {
    if (sortMode === "category") {
      const categoryKeys = [
        ...categories.filter((item) => item !== "その他"),
        "その他",
      ].filter((item, index, array) => array.indexOf(item) === index);

      const unknownCategories = rankedTodos
        .map((todo) => todo.category ?? "その他")
        .filter((item) => !categoryKeys.includes(item));

      const keys = [
        ...categoryKeys,
        ...unknownCategories.filter(
          (item, index, array) => array.indexOf(item) === index
        ),
      ];

      return keys.map((key) => ({
        key,
        label: key,
        todos: rankedTodos.filter((todo) => (todo.category ?? "その他") === key),
      }));
    }

    return priorityOrder.map((key) => ({
      key,
      label: priorityStyles[key].fullLabel,
      todos: rankedTodos.filter((todo) => getPriority(todo) === key),
    }));
  }, [categories, rankedTodos, sortMode]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const beginDragging = (id, clientY) => {
    const target = rankedTodos.find((todo) => todo.id === id);
    if (!target || isReminder(target)) return;

    draggingIdRef.current = id;
    startYRef.current = clientY;
    previousBodyTouchActionRef.current = document.body.style.touchAction;
    previousBodyUserSelectRef.current = document.body.style.userSelect;
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
    setDraggingId(id);
    setDragOffsetY(0);
    pendingDropRef.current = {
      targetId: null,
      targetGroup: null,
      visibleOrderIds: rankedTodos.map((todo) => todo.id),
    };
    setDropTargetId(null);
    setDropTargetGroup(null);
    setOpenMenuId(null);
  };

  const stopDragging = () => {
    clearLongPressTimer();
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOffsetY(0);
    setDropTargetId(null);
    setDropTargetGroup(null);
    document.body.style.touchAction = previousBodyTouchActionRef.current;
    document.body.style.userSelect = previousBodyUserSelectRef.current;
  };

  const handleDragHandlePointerDown = (event, id) => {
    if (!canReorder) return;
    event.preventDefault();
    event.stopPropagation();
    clearLongPressTimer();

    longPressStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      id,
    };

    longPressTimerRef.current = setTimeout(() => {
      beginDragging(id, longPressStartRef.current.y);
    }, 50);
  };

  const handleTaskLongPressPointerDown = (event, id) => {
    if (!canReorder || event.pointerType === "mouse") return;
    event.stopPropagation();
    clearLongPressTimer();
    longPressStartRef.current = { x: event.clientX, y: event.clientY, id };
    longPressTimerRef.current = setTimeout(() => {
      beginDragging(id, longPressStartRef.current.y);
    }, 50);
  };

  useEffect(() => {
    if (!openMenuId) return;

    const closeMenu = (event) => {
      const clickedInsidePopup = event.target?.closest?.("[data-menu-popup='true']");
      const clickedMenuButton = event.target?.closest?.("[data-menu-button='true']");
      if (clickedInsidePopup || clickedMenuButton) return;
      setOpenMenuId(null);
    };

    window.addEventListener("pointerdown", closeMenu, true);
    return () => window.removeEventListener("pointerdown", closeMenu, true);
  }, [openMenuId]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (longPressTimerRef.current && !draggingIdRef.current) {
        const dx = Math.abs(event.clientX - longPressStartRef.current.x);
        const dy = Math.abs(event.clientY - longPressStartRef.current.y);
        if (dx > 8 || dy > 8) clearLongPressTimer();
      }

      if (!draggingIdRef.current) return;
      event.preventDefault();

      const nextOffsetY = event.clientY - startYRef.current;
      setDragOffsetY(nextOffsetY);

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const targetElement = element?.closest?.("[data-todo-id]");
      const sectionElement = element?.closest?.("[data-drop-section]");
      const targetId = Number(targetElement?.dataset?.todoId);
      const targetTodo = rankedTodos.find((todo) => todo.id === targetId);
      const targetGroup = sectionElement?.dataset?.dropSection ?? null;

      if (targetTodo && isReminder(targetTodo)) {
        setDropTargetId(null);
        setDropTargetGroup(null);
        pendingDropRef.current = {
          targetId: null,
          targetGroup: null,
          visibleOrderIds: rankedTodos.map((todo) => todo.id),
        };
        return;
      }

      setDropTargetId(targetId || null);
      setDropTargetGroup(targetGroup);

      pendingDropRef.current = {
        targetId: targetId || null,
        targetGroup,
        visibleOrderIds: rankedTodos.map((todo) => todo.id),
      };
    };

    const handlePointerUp = () => {
      if (longPressTimerRef.current) clearLongPressTimer();
      if (!draggingIdRef.current) return;

      const draggingId = draggingIdRef.current;
      const { targetId, targetGroup, visibleOrderIds } = pendingDropRef.current;

      if (targetId || targetGroup) {
        onReorder(draggingId, targetId, targetGroup, visibleOrderIds);
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
  }, [onReorder, rankedTodos]);

  return (
    <section className="relative z-20 overflow-visible rounded-[22px] border border-slate-100 bg-white p-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
      {rankedTodos.length === 0 ? (
        <div className="rounded-[18px] bg-slate-50/80 px-6 py-7 text-center">
          <p className="text-[13px] font-black text-slate-500">
            表示するTodoはありません
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            達成済みタスクは詳細ページで確認できます。
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sections.map((section) => {
  const collapsed = !showAllTasks && !openSectionKeys.includes(section.key);

            return (
              <TodoSection
                key={section.key}
                section={section}
                sortMode={sortMode}
                collapsed={collapsed}
                onToggleCollapse={() =>
                  setOpenSectionKeys((current) =>
                    current.includes(section.key)
                      ? current.filter((key) => key !== section.key)
                      : [...current, section.key]
                  )
                }
                selectedTaskId={selectedTaskId}
                canSelect={canSelect}
                canComplete={canComplete}
                canEdit={canEdit}
                canDelete={canDelete}
                canMoveTomorrow={canMoveTomorrow}
                canReorder={canReorder}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                draggingId={draggingId}
                dragOffsetY={dragOffsetY}
                dropTargetId={dropTargetId}
                dropTargetGroup={dropTargetGroup}
                onSelect={onSelect}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveTomorrow={onMoveTomorrow}
                onWorkLogEdit={onWorkLogEdit}
                onDragHandlePointerDown={handleDragHandlePointerDown}
                onTaskLongPressPointerDown={handleTaskLongPressPointerDown}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function RecordStat({ label, value }) {
  return (
    <div className="min-w-0 px-1">
      <p className="mb-1 text-[9px] font-black text-slate-600 min-[390px]:text-[10px]">
        {label}
      </p>
      <p className="truncate text-[14px] font-black tracking-[-0.04em] text-slate-950 min-[390px]:text-[16px]">
        {value}
      </p>
    </div>
  );
}

function TodayRecordCard({
  totalPlannedMinutes,
  hasPlannedMinutes,
  totalActualMinutes,
  hasActualMinutes,
  completedCount,
  totalCount,
  onOpenReview,
}) {
  const rate =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <section className="rounded-[22px] border border-slate-100 bg-white p-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.06)] min-[390px]:p-4">
      <div className="mb-3 flex items-center justify-between gap-3 min-[390px]:mb-3.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-[22px] w-[22px] text-emerald-500" strokeWidth={2.25} />
          <h2 className="text-[16px] font-black tracking-[-0.02em] text-slate-950 min-[390px]:text-[17px]">
            今日の記録
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenReview}
          className="flex shrink-0 items-center gap-1 text-[11px] font-black text-emerald-500 min-[390px]:text-[12px]"
        >
          詳細を見る
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-[18px] bg-white px-3 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)] min-[390px]:px-3.5 min-[390px]:py-3.5">
        <div className="grid grid-cols-4 divide-x divide-slate-200 text-center">
  <RecordStat label="総予定" value={hasPlannedMinutes ? formatShortMinutes(totalPlannedMinutes) : "—"} />
  <RecordStat label="総実測" value={hasActualMinutes ? formatShortMinutes(totalActualMinutes) : "—"} />
  <RecordStat label="完了" value={`${completedCount}/${totalCount}`} />
  <RecordStat label="達成率" value={`${rate}%`} />
</div>

        <div className="mt-3.5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function WorkLogModal({ open, targetTodo, targetWorkLog, completeAfterSave, onClose, onSave }) {
  const [durationHour, setDurationHour] = useState(0);
  const [durationMinute, setDurationMinute] = useState(15);

  useEffect(() => {
    if (!open) return;

    const initialMinutes = getInitialActualMinutes(targetTodo, targetWorkLog);
    const hours = Math.floor(initialMinutes / 60);
    const minutes = initialMinutes % 60;

    setDurationHour(hours);
    setDurationMinute(minutes);
  }, [open, targetTodo, targetWorkLog]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();

    const minutes = Number(durationHour) * 60 + Number(durationMinute);
    if (minutes <= 0 || !targetTodo) return;

    onSave({
      taskId: targetTodo.id,
      taskTitle: targetTodo.title,
      category: targetTodo.category,
      priority: getPriority(targetTodo),
      rank: targetTodo.rank,
      minutes,
      seconds: minutes * 60,
      completeAfterSave,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-3 py-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="max-h-[calc(100dvh-28px)] w-full max-w-[480px] overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-slate-950">
            {completeAfterSave ? "実測時間を入力" : "作業データを修正"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-black text-slate-400 active:bg-slate-100"
          >
            閉じる
          </button>
        </div>

        <div className="mb-4 rounded-[20px] bg-emerald-50 p-4">
          <p className="text-xs font-black text-emerald-600">対象タスク</p>
          <p className="mt-1 text-base font-black text-slate-950">
            {targetTodo?.title}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            {completeAfterSave
              ? "0分のままでは達成にできません。実施した時間を入力してください。"
              : "入力した時間が、このタスクの実測作業時間になります。"}
          </p>
        </div>

        <div className="mb-6">
          <span className="mb-2 block text-sm font-black text-slate-600">
            実測の作業時間
          </span>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={durationHour}
              onChange={(e) => setDurationHour(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
            >
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>
                  {i}時間
                </option>
              ))}
            </select>

            <select
              value={durationMinute}
              onChange={(e) => setDurationMinute(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
            >
              {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                <option key={minute} value={minute}>
                  {String(minute).padStart(2, "0")}分
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-14 rounded-2xl bg-slate-100 text-base font-black text-slate-600 active:scale-[0.99]"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="h-14 rounded-2xl bg-emerald-500 text-base font-black text-white active:scale-[0.99]"
          >
            保存する
          </button>
        </div>
      </form>
    </div>
  );
}

function UndoToast({ toast, onUndo, onClose }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-[calc(78px+env(safe-area-inset-bottom))] left-1/2 z-[60] flex w-[calc(100%-24px)] max-w-[480px] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{toast.message}</p>
        <p className="truncate text-xs font-bold text-slate-300">
          {toast.taskTitle}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onUndo}
          className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-emerald-200 active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" />
          元に戻す
        </button>

        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 active:scale-[0.98]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function TodayPage({
  initialDateKey,
  onOpenTimer,
  timerCompletion,
  onTimerCompletionHandled,
  taskUpdateRequest,
  onTaskUpdateHandled,
  appData,
  setAppData,
  onNavigate,
  onOpenReview,
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    if (!initialDateKey) return new Date();
    const [year, month, day] = initialDateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  });

  const selectedDateKey = formatDateForInput(selectedDate);
  const todayDateKey = getTodayKey();

  useEffect(() => {
    if (!initialDateKey) return;
    const [year, month, day] = initialDateKey.split("-").map(Number);
    setSelectedDate(new Date(year, month - 1, day));
  }, [initialDateKey]);

  const todos = appData.tasks ?? initialTodos;
  const categories = appData.categories ?? initialCategories;
  const workLogs = appData.workLogs ?? initialWorkLogs;

  const isPastDate = selectedDateKey < todayDateKey;
  const isFutureDate = selectedDateKey > todayDateKey;
  const isTodayDate = selectedDateKey === todayDateKey;

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => getTodoDateKey(todo) === selectedDateKey);
  }, [todos, selectedDateKey]);

  const filteredWorkLogs = useMemo(() => {
    return workLogs.filter((log) => (log.date ?? todayDateKey) === selectedDateKey);
  }, [workLogs, selectedDateKey, todayDateKey]);

  const syncedDailyRecords = useMemo(() => {
    return syncDailyRecordFromTasks(
      appData.dailyRecords ?? {},
      selectedDateKey,
      filteredTodos
    );
  }, [appData.dailyRecords, selectedDateKey, filteredTodos]);

  const dailyRecord = getOrCreateDailyRecord(syncedDailyRecords, selectedDateKey);
  const totalCount = filteredTodos.length;
  const isEmptyPastDate = isPastDate && totalCount === 0;

  const isReviewConfirmed =
    isEmptyPastDate ||
    (
      totalCount > 0 &&
      (dailyRecord.status === "confirmed" || dailyRecord.reviewCompleted === true)
    );

  const canAddTodo = !isPastDate;
  const canSelectTask = isTodayDate && !isReviewConfirmed;
  const canCompleteTask = isTodayDate && !isReviewConfirmed;
  const canEditTask = !isPastDate;
  const canDeleteTask = !isPastDate;
  const canMoveTomorrow = isTodayDate && !isReviewConfirmed;
  const canReorderTask = !isPastDate;

  const setTodos = (updater) => {
    setAppData((current) => ({
      ...current,
      tasks:
        typeof updater === "function"
          ? updater(current.tasks ?? initialTodos)
          : updater,
    }));
  };

  const setCategories = (updater) => {
    setAppData((current) => ({
      ...current,
      categories:
        typeof updater === "function"
          ? updater(current.categories ?? initialCategories)
          : updater,
    }));
  };

  const setWorkLogs = (updater) => {
    setAppData((current) => ({
      ...current,
      workLogs:
        typeof updater === "function"
          ? updater(current.workLogs ?? initialWorkLogs)
          : updater,
    }));
  };

  const [sortMode, setSortMode] = useState("priority");
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [todoModal, setTodoModal] = useState({
    open: false,
    mode: "add",
    todo: null,
  });
  const [workLogModal, setWorkLogModal] = useState({
    open: false,
    todo: null,
    completeAfterSave: false,
  });
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);

  const selectedTask =
    filteredTodos.find((todo) => todo.id === selectedTaskId && !isCompleted(todo)) ??
    null;

  const completedCount = filteredTodos.filter((t) => isCompleted(t)).length;
  const incompleteTodos = filteredTodos.filter((t) => !isCompleted(t));
  const incompleteCount = incompleteTodos.length;

  const showUndoToast = (toast) => {
    setUndoToast(toast);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 4200);
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedTaskId) return;

    const existsInSelectedDate = filteredTodos.some(
      (todo) => todo.id === selectedTaskId && !isCompleted(todo)
    );

    if (!existsInSelectedDate || !canSelectTask) {
      setSelectedTaskId(null);
    }
  }, [selectedDateKey, filteredTodos, selectedTaskId, canSelectTask]);

  useEffect(() => {
    if (!taskUpdateRequest?.id) return;

    setTodos((current) =>
      current.map((todo) =>
        todo.id === taskUpdateRequest.id
          ? {
              ...todo,
              ...taskUpdateRequest,
              priority: getPriority(taskUpdateRequest),
              rank: taskUpdateRequest.rank ?? todo.rank,
              targetDate: taskUpdateRequest.targetDate ?? getTodoDateKey(todo),
            }
          : todo
      )
    );

    onTaskUpdateHandled?.();
  }, [taskUpdateRequest, onTaskUpdateHandled]);

  useEffect(() => {
    if (!timerCompletion?.task?.id) return;

    const finishedTask = timerCompletion.task;
    const taskDateKey = getTodoDateKey(finishedTask);

    setTodos((current) =>
      current.map((todo) =>
        todo.id === finishedTask.id
          ? {
              ...todo,
              completed: timerCompletion.completed === true,
              taskStatus: timerCompletion.completed === true ? "completed" : todo.taskStatus ?? "pending",
              completedAt: timerCompletion.completed === true ? new Date().toISOString() : todo.completedAt ?? null,
              actualMinutes: timerCompletion.actualMinutes,
actualSeconds:
  timerCompletion.actualSeconds ??
  timerCompletion.actualMinutes * 60,
workedMinutes: timerCompletion.actualMinutes,
focusMinutes: timerCompletion.actualMinutes,
elapsedMinutes: timerCompletion.actualMinutes,
elapsedSeconds:
  timerCompletion.actualSeconds ??
  timerCompletion.actualMinutes * 60,
priority: getPriority(todo),
rank: todo.rank,
targetDate: getTodoDateKey(todo),
            }
          : todo
      )
    );

    setWorkLogs((current) => [
      ...current.filter((log) => log.taskId !== finishedTask.id),
      {
        id: Date.now(),
        taskId: finishedTask.id,
        taskTitle: finishedTask.title,
        category: finishedTask.category,
        priority: getPriority(finishedTask),
        rank: finishedTask.rank,
        minutes: timerCompletion.actualMinutes,
seconds:
  timerCompletion.actualSeconds ??
  timerCompletion.actualMinutes * 60,
date: taskDateKey,
      },
    ]);

    setSelectedTaskId(timerCompletion.completed ? null : finishedTask.id);

    onTimerCompletionHandled?.();
  }, [timerCompletion, onTimerCompletionHandled]);

  const addCategory = (category) => {
    setCategories((current) =>
      current.includes(category) ? current : [...current, category]
    );
  };

  const deleteCategory = (category) => {
    if (category === "その他") return;

    setCategories((current) => current.filter((item) => item !== category));

    setTodos((current) =>
      current.map((todo) =>
        todo.category === category ? { ...todo, category: "その他" } : todo
      )
    );

    setWorkLogs((current) =>
      current.map((log) =>
        log.category === category ? { ...log, category: "その他" } : log
      )
    );
  };

  const saveTodo = (todoData) => {
    if (!canAddTodo) return;

    const normalizedTodoData = {
      ...todoData,
      type: todoData.type ?? (todoData.reminder ? "reminder" : "todo"),
      priority:
        todoData.type === "reminder" || todoData.reminder
          ? "reminder"
          : editablePriorityOrder.includes(todoData.priority)
            ? todoData.priority
            : "medium",
    };

    const reminderFlag = isReminder(normalizedTodoData);

    if (todoModal.mode === "edit") {
      setTodos((current) =>
        current.map((todo) =>
          todo.id === normalizedTodoData.id
            ? {
                ...todo,
                ...normalizedTodoData,
                priority: normalizedTodoData.priority ?? getPriority(todo),
                rank: normalizedTodoData.rank ?? todo.rank,
                targetDate: normalizedTodoData.targetDate ?? getTodoDateKey(todo),
                actualSeconds:
  normalizedTodoData.actualSeconds ??
  (Number(normalizedTodoData.actualMinutes) || 0) * 60,
workedMinutes:
  normalizedTodoData.workedMinutes ??
  normalizedTodoData.actualMinutes ??
  todo.workedMinutes ??
  0,
focusMinutes:
  normalizedTodoData.focusMinutes ??
  normalizedTodoData.actualMinutes ??
  todo.focusMinutes ??
  0,
elapsedMinutes:
  normalizedTodoData.elapsedMinutes ??
  normalizedTodoData.actualMinutes ??
  todo.elapsedMinutes ??
  0,
elapsedSeconds:
  normalizedTodoData.elapsedSeconds ??
  normalizedTodoData.actualSeconds ??
  (Number(normalizedTodoData.actualMinutes) || 0) * 60,
createdDate:
  normalizedTodoData.createdDate ??
  todo.createdDate ??
  getTodoDateKey(todo),
              }
            : todo
        )
      );

      if (
        selectedTaskId === normalizedTodoData.id &&
        (isCompleted(normalizedTodoData) || reminderFlag || !canSelectTask)
      ) {
        setSelectedTaskId(null);
      }

      return;
    }

    const currentDateTodos = todos.filter((todo) => getTodoDateKey(todo) === selectedDateKey);
    const maxRank = currentDateTodos.reduce(
      (max, todo, index) => Math.max(max, getRank(todo, index + 1)),
      0
    );

    const newTodo = {
      ...normalizedTodoData,
      id: Date.now(),
      rank: maxRank + 1,
      completed: false,
      taskStatus: "pending",
      completedAt: null,
      createdDate: selectedDateKey,
      targetDate:
        normalizedTodoData.targetDate ??
        normalizedTodoData.schedule?.date ??
        normalizedTodoData.reminder?.date ??
        selectedDateKey,
      actualMinutes: normalizedTodoData.actualMinutes ?? 0,
      actualSeconds: normalizedTodoData.actualSeconds ?? 0,
    };

    setTodos((current) => [...current, newTodo]);

    if (!reminderFlag && isTodayDate) {
      setSelectedTaskId(newTodo.id);
    } else {
      setSelectedTaskId(null);
    }
  };

  const completeTodo = (target) => {
    const savedWorkLog = workLogs.find((log) => log.taskId === target.id);
    const actualMinutes = getInitialActualMinutes(target, savedWorkLog);

    setTodos((current) =>
      current.map((todo) =>
        todo.id === target.id
          ? {
              ...todo,
              completed: true,
              taskStatus: "completed",
              completedAt: new Date().toISOString(),
              actualMinutes,
              actualSeconds: actualMinutes * 60,
              workedMinutes: actualMinutes,
              focusMinutes: actualMinutes,
              priority: getPriority(todo),
              rank: todo.rank,
              targetDate: getTodoDateKey(todo),
            }
          : todo
      )
    );

    setWorkLogs((current) => [
      ...current.filter((item) => item.taskId !== target.id),
      {
        id: Date.now(),
        taskId: target.id,
        taskTitle: target.title,
        category: target.category,
        priority: getPriority(target),
        rank: target.rank,
        minutes: actualMinutes,
        seconds: actualMinutes * 60,
        date: selectedDateKey,
      },
    ]);

    setSelectedTaskId((current) => (current === target.id ? null : current));
  };

  const toggleTodo = (id) => {
    if (!canCompleteTask) return;

    const target = todos.find((todo) => todo.id === id);
    if (!target) return;

    const reminderFlag = isReminder(target);
    const nextCompleted = !isCompleted(target);

    if (!nextCompleted) {
      setTodos((current) =>
        current.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                completed: false,
                taskStatus: "pending",
                completedAt: null,
              }
            : todo
        )
      );
      if (!reminderFlag) setSelectedTaskId(id);
      return;
    }

    if (reminderFlag) {
      setTodos((current) =>
        current.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                completed: true,
                taskStatus: "completed",
                completedAt: new Date().toISOString(),
                actualMinutes: 0,
                actualSeconds: 0,
                workedMinutes: 0,
                focusMinutes: 0,
                priority: getPriority(todo),
                rank: todo.rank,
                targetDate: getTodoDateKey(todo),
              }
            : todo
        )
      );
      setSelectedTaskId(null);
      return;
    }

    const savedWorkLog = workLogs.find((log) => log.taskId === id);
    const hasActualTime =
      Number(savedWorkLog?.minutes) > 0 ||
      Number(target.actualMinutes) > 0 ||
      Number(target.workedMinutes) > 0 ||
      Number(target.focusMinutes) > 0 ||
      Number(target.elapsedMinutes) > 0;

    if (!hasActualTime) {
      setWorkLogModal({
        open: true,
        todo: target,
        completeAfterSave: true,
      });
      return;
    }

    completeTodo(target);
  };

  const deleteTodo = (todo) => {
    if (!canDeleteTask) return;

    const deletedLogs = workLogs.filter((log) => log.taskId === todo.id);

    setTodos((current) => current.filter((item) => item.id !== todo.id));
    setWorkLogs((current) => current.filter((log) => log.taskId !== todo.id));

    if (selectedTaskId === todo.id) {
      setSelectedTaskId(null);
    }

    showUndoToast({
      type: "delete",
      message: "削除しました",
      taskTitle: todo.title,
      todo,
      workLogs: deletedLogs,
    });
  };

  const moveTodoTomorrow = (todo) => {
    if (!canMoveTomorrow) return;

    const originalDate = getTodoDateKey(todo);
    const tomorrowKey = addDaysToDateKey(todayDateKey, 1);

    setTodos((current) =>
      current.map((item) =>
        item.id === todo.id
          ? {
              ...item,
              completed: false,
              taskStatus: "pending",
              completedAt: null,
              targetDate: tomorrowKey,
              date: item.date === originalDate ? tomorrowKey : item.date,
              schedule: item.schedule
                ? { ...item.schedule, date: tomorrowKey }
                : item.schedule,
              reminder: item.reminder
                ? { ...item.reminder, date: tomorrowKey }
                : item.reminder,
            }
          : item
      )
    );

    if (selectedTaskId === todo.id) {
      setSelectedTaskId(null);
    }

    showUndoToast({
      type: "moveTomorrow",
      message: "明日に移動しました",
      taskTitle: todo.title,
      todo,
      originalDate,
      movedDate: tomorrowKey,
    });
  };

  const undoLastAction = () => {
    if (!undoToast) return;

    if (undoToast.type === "delete") {
      setTodos((current) => {
        const exists = current.some((todo) => todo.id === undoToast.todo.id);
        if (exists) return current;
        return [...current, undoToast.todo];
      });

      setWorkLogs((current) => {
        const restored = undoToast.workLogs ?? [];
        const restoredIds = new Set(restored.map((log) => log.id));
        return [
          ...current.filter((log) => !restoredIds.has(log.id)),
          ...restored,
        ];
      });

      if (getTodoDateKey(undoToast.todo) === selectedDateKey && !isCompleted(undoToast.todo)) {
        setSelectedTaskId(undoToast.todo.id);
      }
    }

    if (undoToast.type === "moveTomorrow") {
      setTodos((current) =>
        current.map((todo) =>
          todo.id === undoToast.todo.id
            ? {
                ...todo,
                targetDate: undoToast.originalDate,
                date:
                  todo.date === undoToast.movedDate
                    ? undoToast.originalDate
                    : todo.date,
                schedule: todo.schedule
                  ? { ...todo.schedule, date: undoToast.originalDate }
                  : todo.schedule,
                reminder: todo.reminder
                  ? { ...todo.reminder, date: undoToast.originalDate }
                  : todo.reminder,
              }
            : todo
        )
      );

      if (!isCompleted(undoToast.todo) && undoToast.originalDate === selectedDateKey) {
        setSelectedTaskId(undoToast.todo.id);
      }
    }

    setUndoToast(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const reorderTodos = (draggingId, targetId, targetGroup, visibleOrderIds = []) => {
    if (!canReorderTask) return;

    setTodos((current) => {
      const draggingTodo = current.find((todo) => todo.id === draggingId);
      const targetTodo = current.find((todo) => todo.id === targetId);

      if (!draggingTodo || isReminder(draggingTodo)) return current;
      if (targetTodo && isReminder(targetTodo)) return current;
      if (targetGroup === "reminder") return current;

      const currentDateTodos = current.filter(
        (todo) => getTodoDateKey(todo) === selectedDateKey && !isCompleted(todo)
      );

      const otherTodos = current.filter(
        (todo) => !(getTodoDateKey(todo) === selectedDateKey && !isCompleted(todo))
      );

      const todoById = new Map(currentDateTodos.map((todo) => [todo.id, todo]));

      const visibleOrderedTodos = visibleOrderIds
        .map((id) => todoById.get(id))
        .filter(Boolean);

      const missingTodos = currentDateTodos.filter(
        (todo) => !visibleOrderIds.includes(todo.id)
      );

      const normalized = [...visibleOrderedTodos, ...missingTodos].map((todo, index) => ({
        ...todo,
        rank: getRank(todo, index + 1),
        priority: getPriority(todo),
      }));

      const draggingIndex = normalized.findIndex((todo) => todo.id === draggingId);
      if (draggingIndex < 0) return current;

      const [draggingTodoFromList] = normalized.splice(draggingIndex, 1);

      const movedTodo = {
        ...draggingTodoFromList,
        priority:
          sortMode === "priority" && targetGroup && editablePriorityOrder.includes(targetGroup)
            ? targetGroup
            : getPriority(draggingTodoFromList),
        category:
          sortMode === "category" && targetGroup
            ? targetGroup
            : draggingTodoFromList.category,
      };

      let insertIndex = normalized.length;

      if (targetId) {
        const targetIndex = normalized.findIndex((todo) => todo.id === targetId);
        if (targetIndex >= 0) {
          insertIndex = targetIndex;
        }
      } else if (targetGroup) {
        const lastInGroupIndex = normalized.reduce((lastIndex, todo, index) => {
          if (sortMode === "priority" && getPriority(todo) === targetGroup) return index;
          if (sortMode === "category" && (todo.category ?? "その他") === targetGroup) return index;
          return lastIndex;
        }, -1);

        insertIndex = lastInGroupIndex >= 0 ? lastInGroupIndex + 1 : normalized.length;
      }

      normalized.splice(insertIndex, 0, movedTodo);

      const reranked =
        sortMode === "priority"
          ? priorityOrder
              .flatMap((priority) =>
                normalized.filter((todo) => getPriority(todo) === priority)
              )
              .map((todo, index) =>
                isReminder(todo)
                  ? todo
                  : {
                      ...todo,
                      rank: index + 1,
                    }
              )
          : normalized.map((todo) => ({
              ...todo,
              rank: todo.rank,
              priority: getPriority(todo),
            }));

      return [...otherTodos, ...reranked];
    });
  };

  const saveWorkLog = (log) => {
    if (isPastDate) return;

    const seconds = log.seconds ?? log.minutes * 60;

    setWorkLogs((current) => [
      ...current.filter((item) => item.taskId !== log.taskId),
      {
        ...log,
        seconds,
        id: Date.now(),
        date: selectedDateKey,
      },
    ]);

    setTodos((current) =>
      current.map((todo) =>
        todo.id === log.taskId
          ? {
              ...todo,
              actualMinutes: log.minutes,
              actualSeconds: seconds,
              workedMinutes: log.minutes,
focusMinutes: log.minutes,
elapsedMinutes: log.minutes,
elapsedSeconds: seconds,
completed: log.completeAfterSave ? true : todo.completed,
              taskStatus: log.completeAfterSave ? "completed" : todo.taskStatus ?? "pending",
              completedAt: log.completeAfterSave ? new Date().toISOString() : todo.completedAt ?? null,
              priority: getPriority(todo),
              rank: todo.rank,
              targetDate: getTodoDateKey(todo),
            }
          : todo
      )
    );

    if (log.completeAfterSave) {
      setSelectedTaskId(null);
    }
  };

  const openWorkLogModal = (todo) => {
    if (!canEditTask || isReminder(todo)) return;
    setWorkLogModal({
      open: true,
      todo,
      completeAfterSave: false,
    });
  };

  const startTimer = () => {
  if (!selectedTask || !canSelectTask) return;
  if (isReminder(selectedTask)) return;

  const savedWorkLog = workLogs.find((log) => log.taskId === selectedTask.id);

const baseSeconds =
  selectedTask.actualSeconds ??
  selectedTask.elapsedSeconds ??
  savedWorkLog?.seconds ??
  ((selectedTask.actualMinutes ??
    selectedTask.elapsedMinutes ??
    selectedTask.workedMinutes ??
    selectedTask.focusMinutes ??
    savedWorkLog?.minutes ??
    0) * 60);

  const baseMinutes =
  selectedTask.actualMinutes ??
  selectedTask.elapsedMinutes ??
  selectedTask.workedMinutes ??
  selectedTask.focusMinutes ??
  savedWorkLog?.minutes ??
  Math.round(baseSeconds / 60);

  onOpenTimer?.({
    ...selectedTask,
    actualMinutes: baseMinutes,
    actualSeconds: baseSeconds,
    elapsedMinutes: baseMinutes,
    elapsedSeconds: baseSeconds,
    workedMinutes: baseMinutes,
    focusMinutes: baseMinutes,
  });
};

  const targetWorkLog = workLogModal.todo
    ? workLogs.find((log) => log.taskId === workLogModal.todo.id)
    : null;

  return (
    <div className="min-h-dvh bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#fbfcfb] px-[max(12px,env(safe-area-inset-left))] pb-[calc(82px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <Header selectedDate={selectedDate} onChangeDate={setSelectedDate} />

        <main className="space-y-2.5 min-[390px]:space-y-3">
          <TodayGoalCard
            totalCount={totalCount}
            incompleteCount={incompleteCount}
            selectedTask={selectedTask}
            onStartTimer={startTimer}
            isReviewConfirmed={isReviewConfirmed}
            isPastDate={isPastDate}
            isFutureDate={isFutureDate}
          />

          <SortModeSwitch
            sortMode={sortMode}
            onChange={setSortMode}
            showAllTasks={showAllTasks}
            onToggleShowAll={() => setShowAllTasks((current) => !current)}
          />

          <TodoListCard
  todos={incompleteTodos}
  showAllTasks={showAllTasks}
  categories={categories}
  sortMode={sortMode}
  selectedTaskId={selectedTaskId}
  canSelect={canSelectTask}
  canComplete={canCompleteTask}
  canEdit={canEditTask}
  canDelete={canDeleteTask}
  canMoveTomorrow={canMoveTomorrow}
  canReorder={canReorderTask}
  onSelect={(todo) => {
    if (!canSelectTask) return;
    if (!isCompleted(todo) && !isReminder(todo)) setSelectedTaskId(todo.id);
  }}
  onToggle={toggleTodo}
  onEdit={(todo) => {
    if (!canEditTask) return;
    setTodoModal({ open: true, mode: "edit", todo });
  }}
  onDelete={deleteTodo}
  onMoveTomorrow={moveTodoTomorrow}
  onWorkLogEdit={openWorkLogModal}
  onReorder={reorderTodos}
/>

          <TodayRecordCard
  totalPlannedMinutes={filteredTodos.reduce((sum, todo) => sum + (isReminder(todo) ? 0 : Number(todo.estimatedMinutes || 0)), 0)}
  hasPlannedMinutes={filteredTodos.some((todo) => !isReminder(todo) && Number(todo.estimatedMinutes) > 0)}
  totalActualMinutes={filteredTodos.reduce((sum, todo) => sum + (isReminder(todo) ? 0 : Number(todo.actualMinutes || todo.workedMinutes || todo.focusMinutes || todo.elapsedMinutes || 0)), 0)}
  hasActualMinutes={filteredTodos.some((todo) => !isReminder(todo) && Number(todo.actualMinutes || todo.workedMinutes || todo.focusMinutes || todo.elapsedMinutes || 0) > 0)}
  completedCount={dailyRecord.completedTaskCount ?? 0}
  totalCount={dailyRecord.createdTaskCount ?? 0}
  onOpenReview={() => onOpenReview?.(selectedDateKey)}
/>
        </main>
      </div>

      <FloatingAddButton
        show={canAddTodo}
        onClick={() => setTodoModal({ open: true, mode: "add", todo: null })}
      />

      <BottomNav active="today" onNavigate={onNavigate} />

      <TodoModal
        open={todoModal.open}
        mode={todoModal.mode}
        initialTodo={todoModal.todo}
        categories={categories}
        onClose={() =>
          setTodoModal({ open: false, mode: "add", todo: null })
        }
        onSave={saveTodo}
        onAddCategory={addCategory}
        onDeleteCategory={deleteCategory}
      />

      <WorkLogModal
        open={workLogModal.open}
        targetTodo={workLogModal.todo}
        targetWorkLog={targetWorkLog}
        completeAfterSave={workLogModal.completeAfterSave}
        onClose={() =>
          setWorkLogModal({
            open: false,
            todo: null,
            completeAfterSave: false,
          })
        }
        onSave={saveWorkLog}
      />

      <UndoToast
        toast={undoToast}
        onUndo={undoLastAction}
        onClose={() => setUndoToast(null)}
      />
    </div>
  );
}