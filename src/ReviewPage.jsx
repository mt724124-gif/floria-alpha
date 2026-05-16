import { useState } from "react";
import AppHeader from "./components/AppHeader";
import TodoModal from "./components/TodoModal";
import mountainImage from "./assets/mountain.png";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  FileText,
  Flag,
  MoreVertical,
  Pencil,
  StickyNote,
  Sun,
  Target,
  Trash2,
} from "lucide-react";
import {
  getOrCreateDailyRecord,
  getTodayKey,
  confirmDailyRecord,
  unconfirmDailyRecord,
  syncDailyRecordFromTasks,
} from "./utils/dailyRecords";

const categoryStyles = {
  学習: {
    icon: BookOpen,
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-600",
  },
  仕事: {
    icon: Briefcase,
    bg: "bg-blue-50",
    text: "text-blue-600",
    badge: "bg-blue-50 text-blue-600",
  },
  健康: {
    icon: Dumbbell,
    bg: "bg-violet-50",
    text: "text-violet-600",
    badge: "bg-violet-50 text-violet-600",
  },
  その他: {
    icon: FileText,
    bg: "bg-slate-50",
    text: "text-slate-500",
    badge: "bg-slate-100 text-slate-500",
  },
};

const initialCategories = ["学習", "仕事", "健康", "その他"];

function formatMinutes(minutes = 0) {
  const total = Math.max(0, Number(minutes) || 0);
  const h = Math.floor(total / 60);
  const m = total % 60;

  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間 ${m}分`;
}

function formatJapaneseDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return `${date.getMonth() + 1}月${date.getDate()}日（${
    weekdays[date.getDay()]
  }）`;
}

function getTaskDateKey(task, fallbackDateKey) {
  return (
    task?.targetDate ??
    task?.date ??
    task?.createdDate ??
    task?.schedule?.date ??
    fallbackDateKey
  );
}

function isReminder(task) {
  return (
    task?.type === "reminder" ||
    Boolean(task?.reminder) ||
    Number(task?.estimatedMinutes) === 0
  );
}

function formatReminderTime(task) {
  const time = task?.reminder?.time ?? task?.schedule?.time ?? "";

  if (!time) return "リマインド予定";

  return `${time} 開始`;
}

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.4} />
        <p className="truncate text-[10px] font-black text-slate-500">
          {label}
        </p>
      </div>

      <p className="truncate text-[14px] font-black tracking-[-0.05em] text-slate-950 min-[390px]:text-[20px]">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({ record }) {
  return (
    <section className="relative mb-3 overflow-hidden rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <img
  src={mountainImage}
  alt="山のイラスト"
  className="pointer-events-none absolute bottom-2 right-2 h-[92px] w-[108px] object-contain opacity-90"
/>

      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-2">
          <Sun className="h-5 w-5 text-yellow-400" fill="currentColor" />
          <h2 className="text-[19px] font-black tracking-[-0.04em] text-slate-950">
            今日の記録
          </h2>
        </div>

        <div className="flex max-w-[275px] items-start gap-5">
          <StatItem
            icon={Clock}
            label="集中時間"
            value={formatMinutes(record.totalActualMinutes)}
          />
          <StatItem
            icon={Check}
            label="完了タスク"
            value={`${record.completedTaskCount ?? 0}件`}
          />
          <StatItem
            icon={Target}
            label="達成率"
            value={`${record.achievementRate ?? 0}%`}
          />
        </div>
      </div>
    </section>
  );
}

function TaskRow({
  task,
  menuOpen,
  disabled = false,
  onToggle,
  onEdit,
  onDelete,
  onToggleMenu,
}) {
  const style = categoryStyles[task.category] ?? categoryStyles["その他"];
  const Icon = style.icon;
  const completed = task.taskStatus === "completed" || task.completed;
  const reminder = isReminder(task);

  return (
    <div className="relative flex items-center gap-2 border-b border-slate-100 px-0 py-3 last:border-b-0">
      <button
  type="button"
  disabled={disabled}
  onClick={() => {
    if (disabled) return;
    onToggle(task);
  }}
  className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-[1.6px] ${
          completed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-emerald-400 bg-white text-transparent"
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </button>

      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${style.bg}`}
      >
        <Icon className={`h-6 w-6 ${style.text}`} strokeWidth={2.2} />
      </div>

      <div className="min-w-0">
        <p className="truncate text-[15px] font-black tracking-[-0.03em] text-slate-950">
          {task.title || "無題のタスク"}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {reminder
              ? formatReminderTime(task)
              : formatMinutes(task.actualMinutes ?? 0)}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-black ${style.badge}`}
          >
            {task.category ?? "その他"}
          </span>
        </div>
      </div>

      <button
  type="button"
  disabled={disabled}
  data-review-menu-button="true"
  onClick={(event) => {
    event.stopPropagation();
    if (disabled) return;
    onToggleMenu(task.id);
  }}
  className={`grid h-8 w-7 shrink-0 place-items-center rounded-xl ${
    disabled
      ? "cursor-not-allowed text-slate-200"
      : "text-slate-400 active:bg-slate-100"
  }`}
>
        <MoreVertical className="h-[18px] w-[18px]" />
      </button>

      {menuOpen && !disabled && (
        <div
          data-review-menu-popup="true"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className="absolute right-2 top-10 z-50 w-40 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.16)]"
        >
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="flex h-11 w-full items-center gap-2 px-4 text-sm font-black text-slate-700 active:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            編集
          </button>

          <button
            type="button"
            onClick={() => onDelete(task)}
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

function TaskSection({
  record,
  disabled = false,
  openMenuId,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onToggleMenu,
}) {
  const tasks = (record.tasks ?? []).filter(
    (task) => task.taskStatus !== "deleted"
  );

  const incompleteTasks = tasks.filter(
    (task) => task.taskStatus !== "completed"
  );

  const completedTasks = tasks.filter(
    (task) => task.taskStatus === "completed"
  );

  return (
    <section className="mb-3 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.055)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-500">
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <h2 className="text-[19px] font-black tracking-[-0.04em] text-slate-950">
            今日のタスク
          </h2>
        </div>

        
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-[14px] font-bold text-slate-400">
          今日はまだ記録されたタスクがありません。
        </div>
      ) : (
        <>
          <div>
            <p className="mb-1 text-[20px] font-black text-slate-700">
  未達成
</p>
            {incompleteTasks.length === 0 ? (
              <p className="rounded-2xl bg-emerald-50 p-3 text-[13px] font-bold text-emerald-600">
                未達成タスクはありません。
              </p>
            ) : (
              incompleteTasks.map((task) => (
                <TaskRow
  key={task.id}
  task={task}
  disabled={disabled}
  menuOpen={openMenuId === task.id}
  onToggle={onToggleTask}
  onEdit={onEditTask}
  onDelete={onDeleteTask}
  onToggleMenu={onToggleMenu}
/>
              ))
            )}
          </div>

          <div>
            <p className="mb-1 mt-4 text-[20px] font-black text-slate-700">
  達成
</p>
            {completedTasks.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-3 text-[13px] font-bold text-slate-400">
                達成タスクはまだありません。
              </p>
            ) : (
              completedTasks.map((task) => (
                <TaskRow
  key={task.id}
  task={task}
  disabled={disabled}
  menuOpen={openMenuId === task.id}
  onToggle={onToggleTask}
  onEdit={onEditTask}
  onDelete={onDeleteTask}
  onToggleMenu={onToggleMenu}
/>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

function LongTaskSection() {
  return (
    <section className="mb-3 rounded-[24px] border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <Flag className="h-6 w-6 text-emerald-500" fill="currentColor" />
        <h2 className="text-[19px] font-black tracking-[-0.04em] text-slate-950">
          長期タスク・メモ
        </h2>
      </div>

      <div className="rounded-[20px] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[14px] font-black text-slate-950">
                長期タスクは後で接続予定
              </p>
              <span className="rounded-md bg-pink-50 px-2 py-1 text-[10px] font-black text-pink-500">
                準備中
              </span>
            </div>
            <p className="mt-1.5 text-[12px] font-bold leading-5 text-slate-400">
              今日進めた長期タスクをここに表示する予定です。
            </p>
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[40%] rounded-full bg-pink-400" />
        </div>
      </div>
    </section>
  );
}

function ReflectionSection({
  reflectionText,
  setReflectionText,
  disabled = false,
}) {
  return (
    <section className="mb-5 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.055)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <StickyNote
            className="h-6 w-6 shrink-0 text-emerald-500"
            strokeWidth={2.3}
          />
          <h2 className="text-[19px] font-black tracking-[-0.04em] text-slate-950">
            今日のメモ・振り返り
          </h2>
        </div>

        <MoreVertical className="h-5 w-5 shrink-0 text-slate-400" />
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
    disabled
      ? "bg-slate-50 text-slate-400"
      : "bg-slate-50 focus:border-emerald-200 focus:bg-white"
  }`}
/>
    </section>
  );
}

export default function ReviewPage({ appData, setAppData, onNavigate }) {
  const dateKey = getTodayKey();

  const [openMenuId, setOpenMenuId] = useState(null);
  const [todoModal, setTodoModal] = useState({
    open: false,
    mode: "edit",
    todo: null,
  });

  const reviewTasks = (appData?.tasks ?? []).filter((task) => {
    return getTaskDateKey(task, dateKey) === dateKey;
  });

  const syncedDailyRecords = syncDailyRecordFromTasks(
    appData?.dailyRecords ?? {},
    dateKey,
    reviewTasks
  );

  const record = getOrCreateDailyRecord(syncedDailyRecords, dateKey);
const isConfirmed = record.status === "confirmed";

const [reflectionText, setReflectionText] = useState(
  record.reflectionText ?? ""
);

  const handleToggleTask = (task) => {
    const nextCompleted = !(task.taskStatus === "completed" || task.completed);

    setAppData((current) => {
      const nextTasks = (current.tasks ?? []).map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null,
            }
          : item
      );

      return {
        ...current,
        tasks: nextTasks,
        dailyRecords: syncDailyRecordFromTasks(
          current.dailyRecords ?? {},
          dateKey,
          nextTasks.filter((item) => getTaskDateKey(item, dateKey) === dateKey)
        ),
      };
    });
  };

  const handleEditTask = (task) => {
    setOpenMenuId(null);
    setTodoModal({
      open: true,
      mode: "edit",
      todo: task,
    });
  };

  const handleDeleteTask = (task) => {
    setOpenMenuId(null);

    setAppData((current) => {
      const nextTasks = (current.tasks ?? []).filter(
        (item) => item.id !== task.id
      );

      return {
        ...current,
        tasks: nextTasks,
        workLogs: (current.workLogs ?? []).filter(
          (log) => log.taskId !== task.id
        ),
        dailyRecords: syncDailyRecordFromTasks(
          current.dailyRecords ?? {},
          dateKey,
          nextTasks.filter((item) => getTaskDateKey(item, dateKey) === dateKey)
        ),
      };
    });
  };

  const handleSaveTask = (updatedTask) => {
    setAppData((current) => {
      const nextTasks = (current.tasks ?? []).map((item) =>
        item.id === updatedTask.id
          ? {
              ...item,
              ...updatedTask,
              targetDate: updatedTask.targetDate ?? getTaskDateKey(item, dateKey),
              createdDate:
                updatedTask.createdDate ??
                item.createdDate ??
                getTaskDateKey(item, dateKey),
            }
          : item
      );

      return {
        ...current,
        tasks: nextTasks,
        dailyRecords: syncDailyRecordFromTasks(
          current.dailyRecords ?? {},
          dateKey,
          nextTasks.filter((item) => getTaskDateKey(item, dateKey) === dateKey)
        ),
      };
    });

    setTodoModal({
      open: false,
      mode: "edit",
      todo: null,
    });
  };

  const confirmReview = () => {
  setAppData((current) => ({
    ...current,
    dailyRecords: confirmDailyRecord(
      syncDailyRecordFromTasks(
        current.dailyRecords ?? {},
        dateKey,
        (current.tasks ?? []).filter(
          (task) => getTaskDateKey(task, dateKey) === dateKey
        )
      ),
      dateKey,
      {
        reflectionText,
      }
    ),
  }));

  onNavigate?.("today");
};

const editReview = () => {
  setAppData((current) => ({
    ...current,
    dailyRecords: unconfirmDailyRecord(
      syncDailyRecordFromTasks(
        current.dailyRecords ?? {},
        dateKey,
        (current.tasks ?? []).filter(
          (task) => getTaskDateKey(task, dateKey) === dateKey
        )
      ),
      dateKey
    ),
  }));
};

  return (
    <div className="min-h-[100dvh] bg-[#fbfcfb] text-slate-950 antialiased">
      <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] px-3 pb-22 pt-[max(8px,env(safe-area-inset-top))]">
        <AppHeader
          title={formatJapaneseDate(dateKey)}
          leftType="back"
          rightType="none"
          onBack={() => onNavigate?.("today")}
        />

        <div className="space-y-0">
          <SummaryCard record={record} />
          <TaskSection
  record={record}
  disabled={isConfirmed}
  openMenuId={openMenuId}
  onToggleTask={handleToggleTask}
  onEditTask={handleEditTask}
  onDeleteTask={handleDeleteTask}
  onToggleMenu={(id) =>
    setOpenMenuId((current) => (current === id ? null : id))
  }
/>
          <LongTaskSection />
          <ReflectionSection
  reflectionText={reflectionText}
  setReflectionText={setReflectionText}
  disabled={isConfirmed}
/>
        </div>

       <button
  type="button"
  onClick={isConfirmed ? editReview : confirmReview}
  className={`fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-1/2 z-30 flex h-[52px] w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 items-center justify-center gap-2 rounded-[20px] text-[17px] font-black shadow-[0_14px_26px_rgba(16,185,129,0.28)] active:scale-[0.985] ${
    isConfirmed
      ? "bg-white text-emerald-600 ring-1 ring-emerald-200"
      : "bg-emerald-500 text-white"
  }`}
>
  <Check className="h-5 w-5" strokeWidth={2.8} />
  {isConfirmed ? "今日の振り返りを編集する" : "今日の振り返りを完了する"}
</button>
      </main>

      <TodoModal
        open={todoModal.open}
        mode={todoModal.mode}
        initialTodo={todoModal.todo}
        categories={appData?.categories ?? initialCategories}
        onClose={() =>
          setTodoModal({
            open: false,
            mode: "edit",
            todo: null,
          })
        }
        onSave={handleSaveTask}
        onAddCategory={(category) => {
          setAppData((current) => ({
            ...current,
            categories: (current.categories ?? initialCategories).includes(
              category
            )
              ? current.categories ?? initialCategories
              : [...(current.categories ?? initialCategories), category],
          }));
        }}
        onDeleteCategory={(category) => {
          if (category === "その他") return;

          setAppData((current) => ({
            ...current,
            categories: (current.categories ?? initialCategories).filter(
              (item) => item !== category
            ),
            tasks: (current.tasks ?? []).map((task) =>
              task.category === category ? { ...task, category: "その他" } : task
            ),
          }));
        }}
      />
    </div>
  );
}