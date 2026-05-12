import React, { useEffect, useMemo, useRef, useState } from "react";
import mountainImage from "./assets/mountain.png";
import TodoModal from "./components/TodoModal";
import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  GripVertical,
  Home,
  Menu,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings,
  BarChart3,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

const defaultCategoryStyles = {
  学習: { icon: BookOpen, color: "text-emerald-500" },
  仕事: { icon: Briefcase, color: "text-blue-500" },
  健康: { icon: Dumbbell, color: "text-violet-500" },
  その他: { icon: CalendarDays, color: "text-slate-500" },
};

const initialCategories = ["学習", "仕事", "健康", "その他"];

const initialTodos = [
  {
    id: 1,
    title: "英単語を30個覚える",
    category: "学習",
    estimatedMinutes: 30,
    completed: false,
    schedule: null,
  },
  {
    id: 2,
    title: "プログラミングの課題に取り組む",
    category: "仕事",
    estimatedMinutes: 90,
    completed: false,
    schedule: null,
  },
  {
    id: 3,
    title: "ジムでトレーニング",
    category: "健康",
    estimatedMinutes: 60,
    completed: false,
    schedule: null,
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

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
    <header className="relative mb-5 flex h-14 items-center justify-between px-1">
      <button className="grid h-11 w-11 place-items-center rounded-2xl text-slate-900 active:bg-slate-100">
        <Menu className="h-7 w-7" strokeWidth={2.4} />
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={() => moveDate(-1)}
          className="grid h-9 w-8 place-items-center rounded-xl text-slate-400 active:bg-slate-100"
        >
          <ChevronRight className="h-5 w-5 rotate-180" strokeWidth={2.6} />
        </button>

        <button
          onClick={() => setCalendarOpen((current) => !current)}
          className="flex items-center text-[17px] font-extrabold tracking-[-0.02em] text-slate-950 active:scale-[0.98]"
        >
          {formatDateForHeader(selectedDate)}
        </button>

        <button
          onClick={() => moveDate(1)}
          className="grid h-9 w-8 place-items-center rounded-xl text-slate-400 active:bg-slate-100"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
        </button>
      </div>

      <button className="relative grid h-11 w-11 place-items-center rounded-2xl text-slate-900 active:bg-slate-100">
        <Bell className="h-7 w-7" strokeWidth={2.25} />
        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
      </button>

      {calendarOpen && (
        <div className="absolute left-1/2 top-14 z-50 w-[260px] -translate-x-1/2 rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
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
            className="mt-3 h-11 w-full rounded-2xl bg-emerald-50 text-sm font-black text-emerald-600"
          >
            今日に戻る
          </button>
        </div>
      )}
    </header>
  );
}

function TodayGoalCard({ incompleteCount, selectedTask, onStartTimer }) {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-emerald-100/70 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.075)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(187,247,208,0.55),transparent_38%),linear-gradient(135deg,rgba(240,253,244,0.88),white_55%)]" />

      <img
        src={mountainImage}
        alt="山のイラスト"
        className="pointer-events-none absolute right-1 top-7 z-0 h-[150px] w-[170px] object-contain opacity-95"
      />

      <div className="relative z-10 min-h-[132px] pr-[128px]">
        <div className="mb-4 flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-[15px]">
            ☀️
          </span>
          {selectedTask ? "選択中のタスク" : "今日の目標"}
        </div>

        {selectedTask ? (
          <>
            <h1 className="mb-2 text-[23px] font-black leading-[1.18] tracking-[-0.045em] text-slate-950">
              {selectedTask.title}
            </h1>
            {!isReminder(selectedTask) && (
  <p className="mb-1 text-[14px] font-bold text-slate-400">
    {selectedTask.category}・予定 {formatMinutes(selectedTask.estimatedMinutes)}
  </p>
)}
          <p className="text-[13px] font-bold leading-relaxed text-emerald-600">
  {isReminder(selectedTask)
    ? (() => {
        const lead =
          selectedTask.reminder?.reminderLead ??
          selectedTask.schedule?.reminderLead;

        if (lead === "0") return "指定時刻にリマインド";
        if (lead === "5") return "5分前にリマインド";
        if (lead === "10") return "10分前にリマインド";
        if (lead === "30") return "30分前にリマインド";
        if (lead === "60") return "1時間前にリマインド";
        if (lead === "1440") return "1日前にリマインド";

        return "リマインド予定";
      })()
    : "このタスクを開始できます。"}
</p>
          </>
        ) : (
          <>
            <h1 className="mb-3 text-[25px] font-black leading-[1.18] tracking-[-0.045em] text-slate-950">
              {incompleteCount > 0
                ? `${incompleteCount}つのタスクを完了しよう！`
                : "今日のタスクは完了！"}
            </h1>
            <p className="text-[15px] font-bold leading-relaxed text-slate-400">
              タスクを選ぶとタイマーを開始できます。
            </p>
          </>
        )}
      </div>

      <button
        onClick={selectedTask ? onStartTimer : undefined}
        disabled={!selectedTask}
        className={`relative z-10 mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-[17px] text-[16px] font-black active:scale-[0.985] ${
          selectedTask
            ? "bg-emerald-500 text-white shadow-[0_12px_22px_rgba(16,185,129,0.26)]"
            : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
        }`}
      >
        <Play
          className={`h-5 w-5 ${selectedTask ? "fill-white" : "fill-slate-400"}`}
        />
        {selectedTask
  ? isReminder(selectedTask)
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
      className="flex h-[66px] w-full items-center justify-between rounded-[22px] border border-slate-100 bg-white px-5 shadow-[0_12px_30px_rgba(15,23,42,0.065)] active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <Plus className="h-8 w-8 text-slate-950" strokeWidth={2.25} />
        <span className="text-[17px] font-black tracking-[-0.02em] text-slate-950">
          Todoを追加
        </span>
      </div>
      <ChevronRight className="h-6 w-6 text-slate-400" strokeWidth={2.4} />
    </button>
  );
}

function TabButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-[62px] text-[15px] font-black ${
        active ? "text-emerald-500" : "text-slate-400"
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-1/2 h-1 w-[72%] -translate-x-1/2 rounded-full bg-emerald-400" />
      )}
    </button>
  );
}

function TodoItem({
  todo,
  selected,
  menuOpen,
  dragging,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onWorkLogEdit,
  onToggleMenu,
  onDragStart,
  onDragEnd,
  onDrop,
}) {
  const config = getCategoryStyle(todo.category);
  const Icon = config.icon;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(todo.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(todo.id)}
      onClick={() => onSelect(todo)}
      className={`relative grid min-h-[72px] cursor-pointer grid-cols-[24px_32px_1fr_auto_auto_26px] items-center gap-2 border-b border-slate-100 px-3 py-3 last:border-b-0 ${
        selected ? "bg-emerald-50/70" : "bg-white"
      } ${dragging ? "opacity-40" : "opacity-100"}`}
    >
      <GripVertical className="h-5 w-5 text-slate-300" />

      <button
  onClick={(event) => {
    event.stopPropagation();
    onToggle(todo.id);
  }}
  className={`grid h-7 w-7 place-items-center rounded-full border-[1.7px] ${
  todo.completed
    ? "border-emerald-500 bg-emerald-500 text-white"
    : "border-slate-300 bg-white text-transparent"
}`}
>
  <Check className="h-4 w-4" strokeWidth={3} />
</button>
      <div className="min-w-0">
        <p
          className={`truncate text-[15px] font-extrabold tracking-[-0.02em] ${
  todo.completed ? "text-slate-400" : "text-slate-950"
}`}
        >
          {todo.title}
        </p>
       {todo.schedule && (
  <p className="mt-1 truncate text-[11px] font-bold text-slate-400">
    {formatDateForTodo(todo.schedule.date)} {todo.schedule.time} 開始
  </p>
)}
      </div>

      <div className={`flex items-center gap-1.5 ${config.color}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
        <span className="max-w-[38px] truncate text-[13px] font-black">
          {todo.category}
        </span>
      </div>

      <div className="flex items-center gap-1 text-slate-400">
  <Clock className="h-5 w-5" strokeWidth={2.2} />
  <span className="text-[13px] font-bold">
    {isReminder(todo)
  ? `${todo.reminder?.time ?? todo.schedule?.time ?? ""}`
  : `${todo.estimatedMinutes}分`}
  </span>
</div>

      <button
        onClick={(event) => {
          event.stopPropagation();
          onToggleMenu(todo.id);
        }}
        className="grid h-8 w-7 place-items-center text-slate-400"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {menuOpen && (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute right-3 top-12 z-50 w-40 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.16)]"
        >
          <button
            onClick={() => onEdit(todo)}
            className="flex h-11 w-full items-center gap-2 px-4 text-sm font-black text-slate-700 active:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            編集
          </button>
         {!isReminder(todo) && (
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

  const incomplete = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);
  const visible = activeTab === "incomplete" ? incomplete : completed;

  return (
    <section className="overflow-visible rounded-[24px] border border-slate-100 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
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
          <div className="px-6 py-8 text-center text-[14px] font-bold text-slate-400">
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
              onDragStart={(id) => setDraggingId(id)}
              onDragEnd={() => setDraggingId(null)}
              onDrop={(targetId) => {
                if (draggingId && draggingId !== targetId) {
                  onReorder(draggingId, targetId);
                }
                setDraggingId(null);
              }}
            />
          ))
        )}
      </div>
    </section>
  );
}

function TodayRecordCard({ totalMinutes, completedCount, totalCount }) {
  const rate =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-6 w-6 text-emerald-500" strokeWidth={2.25} />
          <h2 className="text-[18px] font-black tracking-[-0.02em] text-slate-950">
            今日の記録
          </h2>
        </div>
        <button className="flex items-center gap-1 text-[13px] font-black text-slate-400">
          詳細を見る
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="rounded-[20px] bg-white px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
        <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
          <RecordStat label="総作業時間" value={formatMinutes(totalMinutes)} />
          <RecordStat label="完了タスク" value={`${completedCount} / ${totalCount}`} />
          <RecordStat label="達成率" value={`${rate}%`} />
        </div>
        <div className="mt-5 h-3.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function RecordStat({ label, value }) {
  return (
    <div className="px-1">
      <p className="mb-2 text-[11px] font-black text-slate-700">{label}</p>
      <p className="text-[22px] font-black tracking-[-0.04em] text-slate-950">
        {value}
      </p>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 pb-5 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-[430px] rounded-[28px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-950">
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
            className="h-14 rounded-2xl bg-slate-100 text-base font-black text-slate-600"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="h-14 rounded-2xl bg-emerald-500 text-base font-black text-white"
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
    <div className="fixed bottom-24 left-1/2 z-[60] flex w-[calc(100%-32px)] max-w-[390px] -translate-x-1/2 items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.28)]">
      <div className="min-w-0">
        <p className="truncate text-sm font-black">達成済みにしました</p>
        <p className="truncate text-xs font-bold text-slate-300">{taskTitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-emerald-200"
        >
          <RotateCcw className="h-4 w-4" />
          元に戻す
        </button>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-xl bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BottomNav() {
  const items = [
    { label: "今日", icon: Home, active: true },
    { label: "カレンダー", icon: CalendarDays },
    { label: "統計", icon: BarChart3 },
    { label: "設定", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 grid h-[72px] w-[calc(100%-32px)] max-w-[390px] -translate-x-1/2 grid-cols-4 overflow-hidden rounded-[22px] border border-slate-100 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-black ${
              item.active ? "bg-emerald-50 text-emerald-500" : "text-slate-500"
            }`}
          >
            <Icon
              className={`h-6 w-6 ${item.active ? "fill-emerald-500" : ""}`}
              strokeWidth={2.15}
            />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export default function TodayPage({
  onOpenTimer,
  timerCompletion,
  onTimerCompletionHandled,
  taskUpdateRequest,
  onTaskUpdateHandled,
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [todos, setTodos] = useState(initialTodos);
  const [categories, setCategories] = useState(initialCategories);
  const [workLogs, setWorkLogs] = useState(initialWorkLogs);
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
  todos.find(
    (todo) => todo.id === selectedTaskId && !todo.completed
  ) ?? null;

  const completedCount = todos.filter((t) => t.completed).length;
  const incompleteCount = todos.length - completedCount;

  const totalWorkMinutes = useMemo(
    () => workLogs.reduce((sum, log) => sum + log.minutes, 0),
    [workLogs]
  );

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!taskUpdateRequest?.id) return;

    setTodos((current) =>
      current.map((todo) =>
        todo.id === taskUpdateRequest.id
          ? { ...todo, ...taskUpdateRequest }
          : todo
      )
    );

    onTaskUpdateHandled?.();
  }, [taskUpdateRequest, onTaskUpdateHandled]);

  useEffect(() => {
    if (!timerCompletion?.task?.id) return;

    const finishedTask = timerCompletion.task;

    setTodos((current) =>
      current.map((todo) =>
        todo.id === finishedTask.id
         ? {
    ...todo,
    completed: timerCompletion.completed === true,
    actualMinutes: timerCompletion.actualMinutes,
    actualSeconds: timerCompletion.actualSeconds,
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
        date: formatDateForInput(selectedDate),
      },
    ]);

    setSelectedTaskId(
      timerCompletion.completed ? null : finishedTask.id
    );
    setActiveTab(timerCompletion.completed ? "completed" : "incomplete");

    onTimerCompletionHandled?.();
  }, [timerCompletion, selectedDate, onTimerCompletionHandled]);

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
          ? { ...todo, ...normalizedTodoData }
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
  type: normalizedTodoData.type ?? (normalizedTodoData.reminder ? "reminder" : "todo"),
  id: Date.now(),
  completed: false,
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
      const fromIndex = current.findIndex((todo) => todo.id === draggingId);
      const toIndex = current.findIndex((todo) => todo.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
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
      date: formatDateForInput(selectedDate),
    },
  ]);

  setTodos((current) =>
    current.map((todo) =>
      todo.id === log.taskId
        ? {
            ...todo,
            actualMinutes: log.minutes,
            actualSeconds: seconds,
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

  const savedWorkLog = workLogs.find(
    (log) => log.taskId === selectedTask.id
  );

  onOpenTimer?.({
    ...selectedTask,
    actualMinutes: savedWorkLog?.minutes ?? selectedTask.actualMinutes ?? 0,
    actualSeconds:
      savedWorkLog?.seconds ??
      selectedTask.actualSeconds ??
      ((savedWorkLog?.minutes ?? selectedTask.actualMinutes ?? 0) * 60),
  });
};

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="mx-auto min-h-screen w-full max-w-[390px] bg-[#fbfcfb] px-4 pb-28 pt-4 shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <Header selectedDate={selectedDate} onChangeDate={setSelectedDate} />

        <main className="space-y-4">
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
            todos={todos}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedTaskId={selectedTaskId}
            onSelect={(todo) =>
  !todo.completed && setSelectedTaskId(todo.id)
}
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
            totalCount={todos.length}
          />
        </main>
      </div>

      <BottomNav />

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