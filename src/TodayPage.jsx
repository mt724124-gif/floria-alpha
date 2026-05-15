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
  MoreVertical,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

const defaultCategoryStyles = {
  学習: { icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-50" },
  仕事: { icon: Briefcase, color: "text-blue-500", bg: "bg-blue-50" },
  健康: { icon: Dumbbell, color: "text-violet-500", bg: "bg-violet-50" },
  その他: { icon: CalendarDays, color: "text-slate-500", bg: "bg-slate-50" },
};

const initialCategories = ["学習", "仕事", "健康", "その他"];

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const todayKey = formatDateForInput(new Date());

const initialTodos = [
  {
    id: 1,
    title: "英単語を30個覚える",
    category: "学習",
    estimatedMinutes: 30,
    completed: false,
    schedule: null,
    createdDate: todayKey,
    targetDate: todayKey,
  },
  {
    id: 2,
    title: "プログラミングの課題に取り組む",
    category: "仕事",
    estimatedMinutes: 90,
    completed: false,
    schedule: null,
    createdDate: todayKey,
    targetDate: todayKey,
  },
  {
    id: 3,
    title: "ジムでトレーニング",
    category: "健康",
    estimatedMinutes: 60,
    completed: false,
    schedule: null,
    createdDate: todayKey,
    targetDate: todayKey,
  },
];

const initialWorkLogs = [];

function formatMinutes(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
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
    todayKey
  );
}

function getCategoryStyle(category) {
  return defaultCategoryStyles[category] ?? defaultCategoryStyles["その他"];
}

function isReminder(todo) {
  return (
    todo?.type === "reminder" ||
    Boolean(todo?.reminder) ||
    Number(todo?.estimatedMinutes) === 0
  );
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

function Header({ selectedDate, onChangeDate }) {
  const [calendarOpen, setCalendarOpen] = useState(false);

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
        onPrev={() => moveDate(-1)}
        onNext={() => moveDate(1)}
        onTitleClick={() => setCalendarOpen((current) => !current)}
      />

      {calendarOpen && (
        <div className="absolute left-1/2 top-13 z-50 w-[min(280px,calc(100vw-32px))] -translate-x-1/2 rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
          <p className="mb-3 text-center text-sm font-black text-slate-700">
            日付を選択
          </p>
          <input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={handleDateChange}
            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-center text-base font-extrabold text-slate-900 outline-none focus:border-emerald-400"
          />
          <button
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

function TodayGoalCard({ incompleteCount, selectedTask, onStartTimer }) {
  const selectedIsReminder = isReminder(selectedTask);

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

        {selectedTask ? (
          <>
            <h1 className="mb-1.5 line-clamp-2 text-[20px] font-black leading-[1.15] tracking-[-0.045em] text-slate-950 min-[390px]:text-[22px]">
              {selectedTask.title}
            </h1>

            {!selectedIsReminder && (
              <p className="mb-0.5 text-[12px] font-bold text-slate-400">
                {selectedTask.category}・予定{" "}
                {formatMinutes(selectedTask.estimatedMinutes)}
              </p>
            )}

            <p className="text-[12px] font-bold leading-relaxed text-emerald-600">
              {selectedIsReminder
                ? getReminderLabel(selectedTask)
                : "このタスクを開始できます。"}
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
        onClick={selectedTask ? onStartTimer : undefined}
        disabled={!selectedTask}
        className={`relative z-10 mt-1.5 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] text-[14px] font-black active:scale-[0.985] min-[390px]:h-12 min-[390px]:text-[15px] ${
          selectedTask
            ? selectedIsReminder
              ? "bg-emerald-50 text-emerald-600 shadow-none"
              : "bg-emerald-500 text-white shadow-[0_12px_22px_rgba(16,185,129,0.26)]"
            : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
        }`}
      >
        <Play
          className={`h-5 w-5 ${
            selectedTask && !selectedIsReminder
              ? "fill-white"
              : "fill-current"
          }`}
        />
        {selectedTask
          ? selectedIsReminder
            ? `${selectedTask.reminder?.time ?? selectedTask.schedule?.time ?? ""}予定`
            : "このタスクで集中開始"
          : "タスクを選択してください"}
      </button>
    </section>
  );
}

function AddTodoButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[54px] w-full items-center justify-between rounded-[20px] border border-slate-100 bg-white px-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.055)] active:scale-[0.99] min-[390px]:h-[58px] min-[390px]:px-4"
    >
      <div className="flex items-center gap-2.5 min-[390px]:gap-3">
        <Plus className="h-7 w-7 text-slate-950" strokeWidth={2.25} />
        <span className="text-[15px] font-black tracking-[-0.02em] text-slate-950 min-[390px]:text-[16px]">
          Todoを追加
        </span>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-400" strokeWidth={2.4} />
    </button>
  );
}

function TabButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-[48px] text-[13px] font-black min-[390px]:h-[52px] min-[390px]:text-[14px] ${
        active ? "text-emerald-500" : "text-slate-400"
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-[68%] -translate-x-1/2 rounded-full bg-emerald-400" />
      )}
    </button>
  );
}

function TodoItem({
  todo,
  selected,
  menuOpen,
  dragging,
  dragOffsetY,
  dropTarget,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onWorkLogEdit,
  onToggleMenu,
  onDragHandlePointerDown,
  onTaskLongPressPointerDown,
}) {
  const config = getCategoryStyle(todo.category);
  const Icon = config.icon;
  const reminder = isReminder(todo);

  return (
    <div
      data-todo-id={todo.id}
      onClick={(event) => {
        if (event.defaultPrevented) return;
        onSelect(todo);
      }}
      style={
        dragging
          ? {
              transform: `translate3d(0, ${dragOffsetY}px, 0) scale(1.015)`,
            }
          : undefined
      }
      className={`relative cursor-pointer border-b border-slate-100 px-3 py-2 last:border-b-0 transition-transform duration-100 ease-out ${
        selected ? "bg-emerald-50/70" : "bg-white"
      } ${
        dragging
          ? "pointer-events-none z-40 rounded-[16px] bg-white opacity-95 shadow-[0_12px_28px_rgba(15,23,42,0.16)] ring-1 ring-slate-200"
          : "opacity-100"
      } ${dropTarget && !dragging ? "bg-slate-50" : ""}`}
    >
      <div className="flex min-h-[46px] items-center gap-2">
        <button
          type="button"
          aria-label="順番を並び替え"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => onDragHandlePointerDown(event, todo.id)}
          className={`grid h-9 w-7 shrink-0 touch-none select-none place-items-center rounded-xl transition-all ${
            dragging
              ? "bg-slate-900 text-white shadow-[0_6px_14px_rgba(15,23,42,0.16)]"
              : "text-slate-300 active:bg-slate-100 active:text-slate-500"
          }`}
        >
          <GripVertical
            className={`h-[18px] w-[18px] transition-transform ${
              dragging ? "scale-110" : "scale-100"
            }`}
          />
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggle(todo.id);
          }}
          className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-[1.6px] ${
            todo.completed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 bg-white text-transparent"
          }`}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>

        <div
          className="min-w-0 flex-1 touch-manipulation select-none"
          onPointerDown={(event) => onTaskLongPressPointerDown(event, todo.id)}
        >
          <p
            className={`truncate text-[14px] font-extrabold tracking-[-0.02em] ${
              todo.completed ? "text-slate-400" : "text-slate-950"
            }`}
          >
            {todo.title}
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

            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.2} />
              <span className="text-[11px] font-bold">
                {reminder
                  ? `${todo.reminder?.time ?? todo.schedule?.time ?? ""}`
                  : `${todo.estimatedMinutes}分`}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleMenu(todo.id);
          }}
          className="grid h-8 w-7 shrink-0 place-items-center rounded-xl text-slate-400 active:bg-slate-100"
        >
          <MoreVertical className="h-[18px] w-[18px]" />
        </button>
      </div>

      {menuOpen && (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute right-3 top-10 z-50 w-40 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.16)]"
        >
          <button
            onClick={() => onEdit(todo)}
            className="flex h-11 w-full items-center gap-2 px-4 text-sm font-black text-slate-700 active:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            編集
          </button>

          {!reminder && (
            <button
              onClick={() => onWorkLogEdit(todo)}
              className="flex h-11 w-full items-center gap-2 px-4 text-sm font-black text-emerald-600 active:bg-emerald-50"
            >
              <Clock className="h-4 w-4" />
              作業データ修正
            </button>
          )}

          <button
            onClick={() => onDelete(todo)}
            className="flex h-11 w-full items-center gap-2 px-4 text-sm font-black text-red-500 active:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            削除
          </button>
        </div>
      )}
    </div>
  );
}

function TodoListCard({
  todos,
  activeTab,
  setActiveTab,
  selectedTaskId,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onWorkLogEdit,
  onReorder,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dropTargetId, setDropTargetId] = useState(null);
  const draggingIdRef = useRef(null);
  const startYRef = useRef(0);
  const lastReorderYRef = useRef(0);
  const dropTargetIdRef = useRef(null);
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

  const beginDragging = (id, clientY) => {
    draggingIdRef.current = id;
    startYRef.current = clientY;
    lastReorderYRef.current = clientY;
    dropTargetIdRef.current = null;
    previousBodyTouchActionRef.current = document.body.style.touchAction;
    previousBodyUserSelectRef.current = document.body.style.userSelect;
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";

    setDraggingId(id);
    setDragOffsetY(0);
    setDropTargetId(null);
    setOpenMenuId(null);
  };

  const stopDragging = () => {
    clearLongPressTimer();
    draggingIdRef.current = null;
    dropTargetIdRef.current = null;
    setDraggingId(null);
    setDragOffsetY(0);
    setDropTargetId(null);
    document.body.style.touchAction = previousBodyTouchActionRef.current;
    document.body.style.userSelect = previousBodyUserSelectRef.current;
  };

  const handleDragHandlePointerDown = (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    clearLongPressTimer();
    beginDragging(id, event.clientY);
  };

  const handleTaskLongPressPointerDown = (event, id) => {
    if (event.pointerType === "mouse") return;

    event.stopPropagation();
    clearLongPressTimer();

    longPressStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      id,
    };

    longPressTimerRef.current = setTimeout(() => {
      beginDragging(id, longPressStartRef.current.y);
    }, 260);
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (longPressTimerRef.current && !draggingIdRef.current) {
        const dx = Math.abs(event.clientX - longPressStartRef.current.x);
        const dy = Math.abs(event.clientY - longPressStartRef.current.y);

        if (dx > 8 || dy > 8) {
          clearLongPressTimer();
        }
      }

      if (!draggingIdRef.current) return;

      event.preventDefault();

      const nextOffsetY = event.clientY - startYRef.current;
      setDragOffsetY(nextOffsetY);

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const targetElement = element?.closest?.("[data-todo-id]");
      const targetId = Number(targetElement?.dataset?.todoId);

      if (!targetId || targetId === draggingIdRef.current) {
        dropTargetIdRef.current = null;
        setDropTargetId(null);
        return;
      }

      dropTargetIdRef.current = targetId;
      setDropTargetId(targetId);

      const movedSinceLastReorder = Math.abs(event.clientY - lastReorderYRef.current);
      const shouldPreviewReorder = movedSinceLastReorder > 34;

      if (shouldPreviewReorder) {
  onReorder(draggingIdRef.current, targetId);
  lastReorderYRef.current = event.clientY;
  startYRef.current = event.clientY;

  requestAnimationFrame(() => {
    setDragOffsetY(0);
  });
}
    };

    const handlePointerUp = () => {
      if (longPressTimerRef.current) {
        clearLongPressTimer();
      }

      if (!draggingIdRef.current) return;
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
  }, [onReorder]);

  const incomplete = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);
  const visible = activeTab === "incomplete" ? incomplete : completed;

  return (
    <section className="overflow-visible rounded-[22px] border border-slate-100 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-2 border-b border-slate-100 bg-white">
        <TabButton
          active={activeTab === "incomplete"}
          label={`未達成（${incomplete.length}）`}
          onClick={() => setActiveTab("incomplete")}
        />
        <TabButton
          active={activeTab === "completed"}
          label={`達成済み（${completed.length}）`}
          onClick={() => setActiveTab("completed")}
        />
      </div>

      <div>
        {visible.length === 0 ? (
          <div className="px-6 py-6 text-center text-[13px] font-bold text-slate-400">
            表示するTodoはありません
          </div>
        ) : (
          visible.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
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
              onWorkLogEdit={(target) => {
                setOpenMenuId(null);
                onWorkLogEdit(target);
              }}
              onToggleMenu={(id) =>
                setOpenMenuId((current) => (current === id ? null : id))
              }
              onDragHandlePointerDown={handleDragHandlePointerDown}
              onTaskLongPressPointerDown={handleTaskLongPressPointerDown}
            />
          ))
        )}
      </div>
    </section>
  );
}

function RecordStat({ label, value }) {
  return (
    <div className="min-w-0 px-1">
      <p className="mb-1.5 text-[10px] font-black text-slate-700 min-[390px]:text-[10px]">
        {label}
      </p>
      <p className="truncate text-[18px] font-black tracking-[-0.04em] text-slate-950 min-[390px]:text-[20px]">
        {value}
      </p>
    </div>
  );
}

function TodayRecordCard({ totalMinutes, completedCount, totalCount }) {
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

        <button className="flex shrink-0 items-center gap-1 text-[11px] font-black text-slate-400 min-[390px]:text-[12px]">
          詳細を見る
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-[18px] bg-white px-3 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)] min-[390px]:px-3.5 min-[390px]:py-3.5">
        <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
          <RecordStat label="総作業時間" value={formatMinutes(totalMinutes)} />
          <RecordStat label="完了タスク" value={`${completedCount} / ${totalCount}`} />
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

function WorkLogModal({ open, targetTodo, onClose, onSave }) {
  const [durationHour, setDurationHour] = useState(1);
  const [durationMinute, setDurationMinute] = useState(0);

  useEffect(() => {
    if (!open) return;

    const savedSeconds =
      targetTodo?.actualSeconds ??
      (targetTodo?.actualMinutes != null
        ? targetTodo.actualMinutes * 60
        : 60 * 60);

    const safeSeconds = Math.max(0, Math.round(Number(savedSeconds)));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);

    setDurationHour(hours);
    setDurationMinute(minutes);
  }, [open, targetTodo]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();

    const minutes = Number(durationHour) * 60 + Number(durationMinute);
    if (minutes <= 0 || !targetTodo) return;

    onSave({
      taskId: targetTodo.id,
      taskTitle: targetTodo.title,
      category: targetTodo.category,
      minutes,
      seconds: minutes * 60,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-3 pb-[calc(14px+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="max-h-[calc(100dvh-28px)] w-full max-w-[480px] overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-slate-950">
            作業データを修正
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
            入力した時間が、このタスクの実測作業時間になります。
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
              className="h-14 w-full rounded-2xl border border-slate-200 px-4 text-base font-bold outline-none focus:border-emerald-400"
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
              className="h-14 w-full rounded-2xl border border-slate-200 px-4 text-base font-bold outline-none focus:border-emerald-400"
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

function UndoToast({ visible, taskTitle, onUndo, onClose }) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(78px+env(safe-area-inset-bottom))] left-1/2 z-[60] flex w-[calc(100%-24px)] max-w-[480px] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
      <div className="min-w-0">
        <p className="truncate text-sm font-black">達成済みにしました</p>
        <p className="truncate text-xs font-bold text-slate-300">{taskTitle}</p>
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
  onOpenTimer,
  timerCompletion,
  onTimerCompletionHandled,
  taskUpdateRequest,
  onTaskUpdateHandled,
  appData,
  setAppData,
  onNavigate,
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const selectedDateKey = formatDateForInput(selectedDate);

  const todos = appData.tasks ?? initialTodos;
  const categories = appData.categories ?? initialCategories;
  const workLogs = appData.workLogs ?? initialWorkLogs;

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => getTodoDateKey(todo) === selectedDateKey);
  }, [todos, selectedDateKey]);

  const filteredWorkLogs = useMemo(() => {
    return workLogs.filter((log) => (log.date ?? todayKey) === selectedDateKey);
  }, [workLogs, selectedDateKey]);

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

  const [activeTab, setActiveTab] = useState("incomplete");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [todoModal, setTodoModal] = useState({
    open: false,
    mode: "add",
    todo: null,
  });
  const [workLogTargetTodo, setWorkLogTargetTodo] = useState(null);
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);

  const selectedTask =
    filteredTodos.find((todo) => todo.id === selectedTaskId && !todo.completed) ??
    null;

  const completedCount = filteredTodos.filter((t) => t.completed).length;
  const incompleteCount = filteredTodos.length - completedCount;

  const totalWorkMinutes = useMemo(
    () => filteredWorkLogs.reduce((sum, log) => sum + log.minutes, 0),
    [filteredWorkLogs]
  );

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedTaskId) return;

    const existsInSelectedDate = filteredTodos.some(
      (todo) => todo.id === selectedTaskId && !todo.completed
    );

    if (!existsInSelectedDate) {
      setSelectedTaskId(null);
    }
  }, [selectedDateKey, filteredTodos, selectedTaskId]);

  useEffect(() => {
    if (!taskUpdateRequest?.id) return;

    setTodos((current) =>
      current.map((todo) =>
        todo.id === taskUpdateRequest.id
          ? {
              ...todo,
              ...taskUpdateRequest,
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
              actualMinutes: timerCompletion.actualMinutes,
              actualSeconds: timerCompletion.actualSeconds,
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
        minutes: timerCompletion.actualMinutes,
        seconds: timerCompletion.actualSeconds,
        date: taskDateKey,
      },
    ]);

    setSelectedTaskId(timerCompletion.completed ? null : finishedTask.id);
    setActiveTab(timerCompletion.completed ? "completed" : "incomplete");

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
    const normalizedTodoData = {
      ...todoData,
      type: todoData.type ?? (todoData.reminder ? "reminder" : "todo"),
    };

    const reminderFlag = isReminder(normalizedTodoData);

    if (todoModal.mode === "edit") {
      setTodos((current) =>
        current.map((todo) =>
          todo.id === normalizedTodoData.id
            ? {
                ...todo,
                ...normalizedTodoData,
                targetDate: normalizedTodoData.targetDate ?? getTodoDateKey(todo),
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
        (normalizedTodoData.completed || reminderFlag)
      ) {
        setSelectedTaskId(null);
      }

      return;
    }

    const newTodo = {
      ...normalizedTodoData,
      id: Date.now(),
      completed: false,
      createdDate: selectedDateKey,
      targetDate:
        normalizedTodoData.targetDate ??
        normalizedTodoData.schedule?.date ??
        selectedDateKey,
      actualMinutes: normalizedTodoData.actualMinutes ?? 0,
      actualSeconds: normalizedTodoData.actualSeconds ?? 0,
    };

    setTodos((current) => [...current, newTodo]);

    if (!reminderFlag) {
      setSelectedTaskId(newTodo.id);
    } else {
      setSelectedTaskId(null);
    }

    setActiveTab("incomplete");
  };

  const toggleTodo = (id) => {
    const target = todos.find((todo) => todo.id === id);
    if (!target) return;

    const nextCompleted = !target.completed;

    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: nextCompleted } : todo
      )
    );

    if (nextCompleted) {
      setSelectedTaskId((current) => (current === id ? null : current));
      setUndoToast({ id, taskTitle: target.title });

      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoToast(null), 3000);
    }
  };

  const undoComplete = () => {
    if (!undoToast) return;

    setTodos((current) =>
      current.map((todo) =>
        todo.id === undoToast.id ? { ...todo, completed: false } : todo
      )
    );

    setSelectedTaskId(undoToast.id);
    setUndoToast(null);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const deleteTodo = (todo) => {
    setTodos((current) => current.filter((item) => item.id !== todo.id));
    setWorkLogs((current) => current.filter((log) => log.taskId !== todo.id));

    if (selectedTaskId === todo.id) {
      setSelectedTaskId(null);
    }
  };

  const reorderTodos = (draggingId, targetId) => {
    setTodos((current) => {
      const currentDateTodos = current.filter(
        (todo) => getTodoDateKey(todo) === selectedDateKey
      );

      const otherDateTodos = current.filter(
        (todo) => getTodoDateKey(todo) !== selectedDateKey
      );

      const fromIndex = currentDateTodos.findIndex(
        (todo) => todo.id === draggingId
      );
      const toIndex = currentDateTodos.findIndex((todo) => todo.id === targetId);

      if (fromIndex < 0 || toIndex < 0) return current;

      const nextDateTodos = [...currentDateTodos];
      const [moved] = nextDateTodos.splice(fromIndex, 1);
      nextDateTodos.splice(toIndex, 0, moved);

      return [...otherDateTodos, ...nextDateTodos];
    });
  };

  const saveWorkLog = (log) => {
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
              targetDate: getTodoDateKey(todo),
            }
          : todo
      )
    );
  };

  const openWorkLogModal = (todo) => {
    setWorkLogTargetTodo(todo);
  };

  const startTimer = () => {
    if (!selectedTask) return;

    if (isReminder(selectedTask)) {
      return;
    }

    const savedWorkLog = workLogs.find((log) => log.taskId === selectedTask.id);

    onOpenTimer?.({
      ...selectedTask,
      actualMinutes: savedWorkLog?.minutes ?? selectedTask.actualMinutes ?? 0,
      actualSeconds:
        savedWorkLog?.seconds ??
        selectedTask.actualSeconds ??
        (savedWorkLog?.minutes ?? selectedTask.actualMinutes ?? 0) * 60,
    });
  };

  return (
    <div className="min-h-dvh bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#fbfcfb] px-[max(12px,env(safe-area-inset-left))] pb-[calc(82px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <Header selectedDate={selectedDate} onChangeDate={setSelectedDate} />

        <main className="space-y-2.5 min-[390px]:space-y-3">
          <TodayGoalCard
            incompleteCount={incompleteCount}
            selectedTask={selectedTask}
            onStartTimer={startTimer}
          />

          <AddTodoButton
            onClick={() =>
              setTodoModal({ open: true, mode: "add", todo: null })
            }
          />

          <TodoListCard
            todos={filteredTodos}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedTaskId={selectedTaskId}
            onSelect={(todo) => !todo.completed && setSelectedTaskId(todo.id)}
            onToggle={toggleTodo}
            onEdit={(todo) =>
              setTodoModal({ open: true, mode: "edit", todo })
            }
            onDelete={deleteTodo}
            onWorkLogEdit={openWorkLogModal}
            onReorder={reorderTodos}
          />

          <TodayRecordCard
            totalMinutes={totalWorkMinutes}
            completedCount={completedCount}
            totalCount={filteredTodos.length}
          />
        </main>
      </div>

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
        open={Boolean(workLogTargetTodo)}
        targetTodo={workLogTargetTodo}
        onClose={() => setWorkLogTargetTodo(null)}
        onSave={saveWorkLog}
      />

      <UndoToast
        visible={Boolean(undoToast)}
        taskTitle={undoToast?.taskTitle}
        onUndo={undoComplete}
        onClose={() => setUndoToast(null)}
      />
    </div>
  );
}
