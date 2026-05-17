import { useEffect, useRef, useState } from "react";
import AppHeader from "./components/AppHeader";
import TodoModal from "./components/TodoModal";
import mountainImage from "./assets/mountain.png";
import {
  BookOpen,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  FileText,
  Flag,
  MoreVertical,
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
  syncDailyRecordFromTasks,
} from "./utils/dailyRecords";

const categoryStyles = {
  学習: { icon: BookOpen, bg: "bg-emerald-50", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-600" },
  仕事: { icon: Briefcase, bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-50 text-blue-600" },
  健康: { icon: Dumbbell, bg: "bg-violet-50", text: "text-violet-600", badge: "bg-violet-50 text-violet-600" },
  その他: { icon: FileText, bg: "bg-slate-50", text: "text-slate-500", badge: "bg-slate-100 text-slate-500" },
};

const initialCategories = ["学習", "仕事", "健康", "その他"];

function getTomorrowKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toLocaleDateString("sv-SE");
}

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
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function getTaskDateKey(task, fallbackDateKey) {
  return task?.targetDate ?? task?.date ?? task?.createdDate ?? task?.schedule?.date ?? fallbackDateKey;
}

function isReminder(task) {
  return task?.type === "reminder" || Boolean(task?.reminder);
}

function formatReminderTime(task) {
  const time = task?.reminder?.time ?? task?.schedule?.time ?? "";
  if (!time) return "リマインド予定";
  return `${time} 開始`;
}

function getInitialActualMinutes(task, workLog) {
  const candidates = [
    workLog?.minutes,
    task?.actualMinutes,
    task?.workedMinutes,
    task?.focusMinutes,
    task?.elapsedMinutes,
    task?.estimatedMinutes,
    15,
  ];
  const found = candidates.find((value) => Number(value) > 0);
  return Number(found ?? 15);
}

function isCompleted(task) {
  return task?.taskStatus === "completed" || task?.completed === true;
}

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.4} />
        <p className="truncate text-[10px] font-black text-slate-500">{label}</p>
      </div>
      <p className="truncate text-[14px] font-black tracking-[-0.05em] text-slate-950 min-[390px]:text-[20px]">{value}</p>
    </div>
  );
}

function SummaryCard({ record }) {
  return (
    <section className="relative mb-3 overflow-hidden rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <img src={mountainImage} alt="山のイラスト" className="pointer-events-none absolute bottom-2 right-2 h-[92px] w-[108px] object-contain opacity-90" />
      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-2">
          <Sun className="h-5 w-5 text-yellow-400" fill="currentColor" />
          <h2 className="text-[19px] font-black tracking-[-0.04em] text-slate-950">今日の記録</h2>
        </div>
        <div className="flex max-w-[275px] items-start gap-5">
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
            {completeAfterSave ? "0分のままでは達成にできません。実施した時間を入力してください。" : "入力した時間が、このタスクの実測作業時間になります。"}
          </p>
        </div>

        <div className="mb-6">
          <span className="mb-2 block text-sm font-black text-slate-600">実測の作業時間</span>
          <div className="grid grid-cols-2 gap-3">
            <select value={durationHour} onChange={(e) => setDurationHour(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400">
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>{i}時間</option>
              ))}
            </select>
            <select value={durationMinute} onChange={(e) => setDurationMinute(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400">
              {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                <option key={minute} value={minute}>{String(minute).padStart(2, "0")}分</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="h-14 rounded-2xl bg-slate-100 text-base font-black text-slate-600 active:scale-[0.99]">キャンセル</button>
          <button type="submit" className="h-14 rounded-2xl bg-emerald-500 text-base font-black text-white active:scale-[0.99]">保存する</button>
        </div>
      </form>
    </div>
  );
}

function TaskRow({ task, menuOpen, disabled = false, onToggle, onEdit, onDelete, onPostponeTomorrow, onWorkLogEdit, onToggleMenu }) {
  const style = categoryStyles[task.category] ?? categoryStyles["その他"];
  const Icon = style.icon;
  const completed = isCompleted(task);
  const reminder = isReminder(task);
  const [dragX, setDragX] = useState(0);
  const [startPoint, setStartPoint] = useState(null);

  const handlePointerDown = (event) => {
    if (disabled || completed) return;
    if (event.pointerType === "mouse") return;
    setStartPoint({ x: event.clientX, y: event.clientY });
  };

  const handlePointerMove = (event) => {
    if (disabled || completed || !startPoint) return;

    const dx = event.clientX - startPoint.x;
    const dy = event.clientY - startPoint.y;

    if (Math.abs(dy) > 20 && Math.abs(dy) > Math.abs(dx)) {
      setStartPoint(null);
      setDragX(0);
      return;
    }

    if (Math.abs(dx) < 8) return;

    event.preventDefault();
    setDragX(Math.max(-96, Math.min(96, dx)));
  };

  const handlePointerUp = () => {
    if (disabled || completed || !startPoint) {
      setStartPoint(null);
      setDragX(0);
      return;
    }

    if (dragX >= 70) {
      onPostponeTomorrow(task);
    }

    if (dragX <= -70) {
      onDelete(task);
    }

    setStartPoint(null);
    setDragX(0);
  };

  return (
    <div
  className={`relative border-b border-slate-100 last:border-b-0 ${
    menuOpen ? "z-50 overflow-visible" : "z-0 overflow-hidden"
  }`}
>
      {!completed && !disabled && (
        <>
          <div className="absolute inset-y-0 left-0 flex w-28 items-center justify-start bg-amber-50 pl-4 text-[12px] font-black text-amber-600">明日に延期</div>
          <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-end bg-red-50 pr-4 text-[12px] font-black text-red-500">削除</div>
        </>
      )}

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ transform: `translateX(${dragX}px)` }}
        className="relative z-10 flex items-center gap-2 bg-white px-0 py-3 transition-transform"
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            onToggle(task);
          }}
          className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-[1.6px] ${
            completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-400 bg-white text-transparent"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>

        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${style.bg}`}>
          <Icon className={`h-6 w-6 ${style.text}`} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black tracking-[-0.03em] text-slate-950">{task.title || "無題のタスク"}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {reminder ? formatReminderTime(task) : formatMinutes(task.actualMinutes ?? task.workedMinutes ?? task.focusMinutes ?? 0)}
            </span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${style.badge}`}>{task.category ?? "その他"}</span>
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
          className={`grid h-8 w-7 shrink-0 place-items-center rounded-xl ${disabled ? "cursor-not-allowed text-slate-200" : "text-slate-400 active:bg-slate-100"}`}
        >
          <MoreVertical className="h-[18px] w-[18px]" />
        </button>

        {menuOpen && !disabled && (
          <div
  data-review-menu-popup="true"
  onPointerDown={(event) => event.stopPropagation()}
  onClick={(event) => event.stopPropagation()}
  className="absolute right-2 top-10 z-[999] w-44 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.16)]"
>
            <button type="button" onClick={() => onEdit(task)} className="flex h-11 w-full items-center gap-2 px-4 text-sm font-black text-slate-700 active:bg-slate-50">
              <Pencil className="h-4 w-4" />
              編集
            </button>
            {!reminder && (
              <button type="button" onClick={() => onWorkLogEdit(task)} className="flex h-11 w-full items-center gap-2 px-4 text-sm font-black text-emerald-600 active:bg-emerald-50">
                <Clock className="h-4 w-4" />
                作業データ修正
              </button>
            )}
            {!completed && (
              <button type="button" onClick={() => onPostponeTomorrow(task)} className="flex h-11 w-full items-center gap-2 px-4 text-sm font-black text-amber-600 active:bg-amber-50">
                <ChevronRight className="h-4 w-4" />
                明日に延期
              </button>
            )}
            <button type="button" onClick={() => onDelete(task)} className="flex h-11 w-full items-center gap-2 px-4 text-sm font-black text-red-500 active:bg-red-50">
              <Trash2 className="h-4 w-4" />
              削除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskSection({ record, disabled = false, openMenuId, onToggleTask, onEditTask, onDeleteTask, onPostponeTomorrow, onWorkLogEdit, onToggleMenu }) {
  const tasks = (record.tasks ?? []).filter((task) => task.taskStatus !== "deleted");
  const incompleteTasks = tasks.filter((task) => !isCompleted(task));
  const completedTasks = tasks.filter((task) => isCompleted(task));

  return (
    <section className="relative z-20 mb-3 overflow-visible rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.055)]">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-500">
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <h2 className="text-[19px] font-black tracking-[-0.04em] text-slate-950">今日のタスク</h2>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-5 text-center text-[14px] font-bold text-emerald-600">この日は記録されたTodoがありません。振り返りは完了扱いです。</div>
      ) : (
        <>
          <div>
            <p className="mb-1 text-[20px] font-black text-slate-700">未達成</p>
            {incompleteTasks.length === 0 ? (
              <p className="rounded-2xl bg-emerald-50 p-3 text-[13px] font-bold text-emerald-600">未達成タスクはありません。</p>
            ) : (
              incompleteTasks.map((task) => (
                <TaskRow key={task.id} task={task} disabled={disabled} menuOpen={openMenuId === task.id} onToggle={onToggleTask} onEdit={onEditTask} onDelete={onDeleteTask} onPostponeTomorrow={onPostponeTomorrow} onWorkLogEdit={onWorkLogEdit} onToggleMenu={onToggleMenu} />
              ))
            )}
          </div>

          <div>
            <p className="mb-1 mt-4 text-[20px] font-black text-slate-700">達成</p>
            {completedTasks.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-3 text-[13px] font-bold text-slate-400">達成タスクはまだありません。</p>
            ) : (
              completedTasks.map((task) => (
                <TaskRow key={task.id} task={task} disabled={disabled} menuOpen={openMenuId === task.id} onToggle={onToggleTask} onEdit={onEditTask} onDelete={onDeleteTask} onPostponeTomorrow={onPostponeTomorrow} onWorkLogEdit={onWorkLogEdit} onToggleMenu={onToggleMenu} />
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
        <h2 className="text-[19px] font-black tracking-[-0.04em] text-slate-950">長期タスク・メモ</h2>
      </div>
      <div className="rounded-[20px] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[14px] font-black text-slate-950">長期タスクは後で接続予定</p>
              <span className="rounded-md bg-pink-50 px-2 py-1 text-[10px] font-black text-pink-500">準備中</span>
            </div>
            <p className="mt-1.5 text-[12px] font-bold leading-5 text-slate-400">今日進めた長期タスクをここに表示する予定です。</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
        </div>
      </div>
    </section>
  );
}

function ReflectionSection({ reflectionText, setReflectionText, disabled = false }) {
  return (
    <section className="mb-5 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.055)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <StickyNote className="h-6 w-6 shrink-0 text-emerald-500" strokeWidth={2.3} />
          <h2 className="text-[19px] font-black tracking-[-0.04em] text-slate-950">今日のメモ・振り返り</h2>
        </div>
        <MoreVertical className="h-5 w-5 shrink-0 text-slate-400" />
      </div>
      <textarea value={reflectionText} disabled={disabled} onChange={(event) => { if (disabled) return; setReflectionText(event.target.value); }} placeholder="AIによるフィードバックを行う際に使用されます。" className={`min-h-[92px] w-full resize-none rounded-[18px] border border-slate-100 p-3 text-[14px] font-bold leading-6 text-slate-800 outline-none placeholder:text-slate-400 ${disabled ? "bg-slate-50 text-slate-400" : "bg-slate-50 focus:border-emerald-200 focus:bg-white"}`} />
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
  const [openMenuId, setOpenMenuId] = useState(null);
  const [todoModal, setTodoModal] = useState({ open: false, mode: "edit", todo: null });
  const [workLogModal, setWorkLogModal] = useState({ open: false, task: null, completeAfterSave: false });
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);

  const reviewTasks = (appData?.tasks ?? []).filter((task) => getTaskDateKey(task, dateKey) === dateKey);
  const syncedDailyRecords = syncDailyRecordFromTasks(appData?.dailyRecords ?? {}, dateKey, reviewTasks);
  const record = getOrCreateDailyRecord(syncedDailyRecords, dateKey);
  const activeTasks = (record.tasks ?? []).filter((task) => task.taskStatus !== "deleted");
  const incompleteTasks = activeTasks.filter((task) => !isCompleted(task));
  const taskCount = activeTasks.length;
  const isAutoCompletedEmptyDay = taskCount === 0;
  const isConfirmed = record.status === "confirmed" || record.reviewCompleted === true || isAutoCompletedEmptyDay;
  const canConfirm = !isConfirmed && incompleteTasks.length === 0;

  const [reflectionText, setReflectionText] = useState(record.reflectionText ?? "");

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

  const showUndoToast = (toast) => {
    setUndoToast(toast);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 4200);
  };

  const syncCurrentDateRecords = (current, nextTasks) => {
    return syncDailyRecordFromTasks(
      current.dailyRecords ?? {},
      dateKey,
      nextTasks.filter((item) => getTaskDateKey(item, dateKey) === dateKey)
    );
  };

  const completeTask = (task) => {
    const reminderFlag = isReminder(task);
    const workLog = (appData?.workLogs ?? []).find((log) => log.taskId === task.id);
    const minutes = reminderFlag ? 0 : getInitialActualMinutes(task, workLog);
    const seconds = reminderFlag ? 0 : minutes * 60;

    setAppData((current) => {
      const nextTasks = (current.tasks ?? []).map((item) =>
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
            }
          : item
      );

      const nextWorkLogs = reminderFlag
        ? current.workLogs ?? []
        : [
            ...(current.workLogs ?? []).filter((log) => log.taskId !== task.id),
            { id: Date.now(), taskId: task.id, taskTitle: task.title, category: task.category, minutes, seconds, date: dateKey },
          ];

      return {
        ...current,
        tasks: nextTasks,
        workLogs: nextWorkLogs,
        dailyRecords: syncCurrentDateRecords(current, nextTasks),
      };
    });
  };

  const handleToggleTask = (task) => {
    if (isConfirmed) return;
    const nextCompleted = !isCompleted(task);

    if (!nextCompleted) {
      setAppData((current) => {
        const nextTasks = (current.tasks ?? []).map((item) =>
          item.id === task.id
            ? { ...item, completed: false, taskStatus: "pending", completedAt: null }
            : item
        );
        return { ...current, tasks: nextTasks, dailyRecords: syncCurrentDateRecords(current, nextTasks) };
      });
      return;
    }

    if (isReminder(task)) {
      completeTask(task);
      return;
    }

    const workLog = (appData?.workLogs ?? []).find((log) => log.taskId === task.id);
    const hasActualTime =
      Number(workLog?.minutes) > 0 ||
      Number(task.actualMinutes) > 0 ||
      Number(task.workedMinutes) > 0 ||
      Number(task.focusMinutes) > 0 ||
      Number(task.elapsedMinutes) > 0;

    if (!hasActualTime) {
      setWorkLogModal({ open: true, task, completeAfterSave: true });
      return;
    }

    completeTask(task);
  };

  const handleEditTask = (task) => {
    if (isConfirmed) return;
    setOpenMenuId(null);
    setTodoModal({ open: true, mode: "edit", todo: task });
  };

  const handleWorkLogEdit = (task) => {
    if (isConfirmed || isReminder(task)) return;
    setOpenMenuId(null);
    setWorkLogModal({ open: true, task, completeAfterSave: false });
  };

  const handleDeleteTask = (task) => {
    if (isConfirmed) return;
    setOpenMenuId(null);

    const deletedLogs = (appData?.workLogs ?? []).filter((log) => log.taskId === task.id);

    setAppData((current) => {
      const nextTasks = (current.tasks ?? []).filter((item) => item.id !== task.id);
      return {
        ...current,
        tasks: nextTasks,
        workLogs: (current.workLogs ?? []).filter((log) => log.taskId !== task.id),
        dailyRecords: syncCurrentDateRecords(current, nextTasks),
      };
    });

    showUndoToast({ type: "delete", message: "削除しました", taskTitle: task.title, task, workLogs: deletedLogs });
  };

  const handlePostponeTomorrow = (task) => {
    if (isConfirmed) return;

    const tomorrowKey = getTomorrowKey(dateKey);
    const originalDate = getTaskDateKey(task, dateKey);
    setOpenMenuId(null);

    setAppData((current) => {
      const nextTasks = (current.tasks ?? []).map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: false,
              taskStatus: "pending",
              completedAt: null,
              targetDate: tomorrowKey,
              date: item.date === originalDate ? tomorrowKey : item.date,
              schedule: item.schedule ? { ...item.schedule, date: tomorrowKey } : item.schedule,
            }
          : item
      );
      return { ...current, tasks: nextTasks, dailyRecords: syncCurrentDateRecords(current, nextTasks) };
    });

    showUndoToast({ type: "postpone", message: "明日に移動しました", taskTitle: task.title, task, originalDate, movedDate: tomorrowKey });
  };

  const handleSaveWorkLog = (log) => {
    if (isConfirmed) return;

    setAppData((current) => {
      const nextTasks = (current.tasks ?? []).map((task) =>
        task.id === log.taskId
          ? {
              ...task,
              actualMinutes: log.minutes,
              actualSeconds: log.seconds,
              workedMinutes: log.minutes,
              focusMinutes: log.minutes,
              completed: log.completeAfterSave ? true : task.completed,
              taskStatus: log.completeAfterSave ? "completed" : task.taskStatus ?? "pending",
              completedAt: log.completeAfterSave ? new Date().toISOString() : task.completedAt ?? null,
            }
          : task
      );

      const nextWorkLogs = [
        ...(current.workLogs ?? []).filter((item) => item.taskId !== log.taskId),
        { ...log, id: Date.now(), date: dateKey },
      ];

      return { ...current, tasks: nextTasks, workLogs: nextWorkLogs, dailyRecords: syncCurrentDateRecords(current, nextTasks) };
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
              targetDate: updatedTask.targetDate ?? getTaskDateKey(item, dateKey),
              createdDate: updatedTask.createdDate ?? item.createdDate ?? getTaskDateKey(item, dateKey),
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
        const nextWorkLogs = [...(current.workLogs ?? []).filter((log) => !restoredIds.has(log.id)), ...restoredLogs];
        return { ...current, tasks: nextTasks, workLogs: nextWorkLogs, dailyRecords: syncCurrentDateRecords(current, nextTasks) };
      });
    }

    if (undoToast.type === "postpone") {
      setAppData((current) => {
        const nextTasks = (current.tasks ?? []).map((task) =>
          task.id === undoToast.task.id
            ? {
                ...task,
                targetDate: undoToast.originalDate,
                date: task.date === undoToast.movedDate ? undoToast.originalDate : task.date,
                schedule: task.schedule ? { ...task.schedule, date: undoToast.originalDate } : task.schedule,
              }
            : task
        );
        return { ...current, tasks: nextTasks, dailyRecords: syncCurrentDateRecords(current, nextTasks) };
      });
    }

    setUndoToast(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const confirmReview = () => {
    if (!canConfirm) return;

    setAppData((current) => ({
      ...current,
      dailyRecords: confirmDailyRecord(
        syncDailyRecordFromTasks(current.dailyRecords ?? {}, dateKey, (current.tasks ?? []).filter((task) => getTaskDateKey(task, dateKey) === dateKey)),
        dateKey,
        { reflectionText }
      ),
    }));

    onNavigate?.("today");
  };

  const targetWorkLog = workLogModal.task
    ? (appData?.workLogs ?? []).find((log) => log.taskId === workLogModal.task.id)
    : null;

  return (
    <div className="min-h-[100dvh] bg-[#fbfcfb] text-slate-950 antialiased">
      <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] px-3 pb-22 pt-[max(8px,env(safe-area-inset-top))]">
        <AppHeader title={formatJapaneseDate(dateKey)} leftType="back" rightType="none" onBack={() => onNavigate?.("today")} />

        <div className="space-y-0">
          <SummaryCard record={record} />

          {isAutoCompletedEmptyDay && (
            <div className="mb-3 rounded-[20px] bg-emerald-50 px-4 py-3 text-[13px] font-black leading-5 text-emerald-700">
              この日は記録されたTodoがないため、振り返りは自動で完了しました。
            </div>
          )}

          {!isAutoCompletedEmptyDay && isConfirmed && (
            <div className="mb-3 rounded-[20px] bg-emerald-50 px-4 py-3 text-[13px] font-black leading-5 text-emerald-700">
              {formatJapaneseDate(dateKey)}の振り返りは完了しました。
            </div>
          )}

          {!isConfirmed && incompleteTasks.length > 0 && (
            <div className="mb-3 rounded-[20px] bg-amber-50 px-4 py-3 text-[13px] font-bold leading-5 text-amber-700">
              未達成タスクを「達成・明日に延期・削除」のどれかに整理すると、振り返りを完了できます。
            </div>
          )}

          <TaskSection
            record={record}
            disabled={isConfirmed}
            openMenuId={openMenuId}
            onToggleTask={handleToggleTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onPostponeTomorrow={handlePostponeTomorrow}
            onWorkLogEdit={handleWorkLogEdit}
            onToggleMenu={(id) => setOpenMenuId((current) => (current === id ? null : id))}
          />

          {!isAutoCompletedEmptyDay && <LongTaskSection />}

          {!isAutoCompletedEmptyDay && (
            <ReflectionSection
              reflectionText={reflectionText}
              setReflectionText={setReflectionText}
              disabled={isConfirmed}
            />
          )}
        </div>

        {!isConfirmed && (
          <button
            type="button"
            disabled={!canConfirm}
            onClick={confirmReview}
            className={`fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-1/2 z-30 flex h-[52px] w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 items-center justify-center gap-2 rounded-[20px] text-[17px] font-black shadow-[0_14px_26px_rgba(16,185,129,0.28)] active:scale-[0.985] ${
              canConfirm ? "bg-emerald-500 text-white" : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
            }`}
          >
            <Check className="h-5 w-5" strokeWidth={2.8} />
            {canConfirm ? "今日の振り返りを完了する" : "未達成タスクを整理してください"}
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