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

function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

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
  return `${h}時間${m}分`;
}

function formatJapaneseDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function getTaskDateKey(task, fallbackDateKey) {
  return task?.targetDate ?? task?.date ?? task?.createdDate ?? fallbackDateKey;
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
      <p className="truncate text-[14px] font-black tracking-[-0.05em] text-slate-950 min-[390px]:text-[18px]">{value}</p>
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
          <h2 className="text-[18px] font-black tracking-[-0.04em] text-slate-950">今日の記録</h2>
        </div>
        <div className="grid max-w-[280px] grid-cols-3 gap-4">
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

function TaskRow({ task, disabled = false, moveLabel = "明日へ", onToggle, onEdit, onDelete, onPostponeTomorrow }) {
  const style = categoryStyles[task.category] ?? categoryStyles["その他"];
  const Icon = style.icon;
  const completed = isCompleted(task);

  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartRef = useRef({ x: 0, y: 0 });
  const swipeActiveRef = useRef(false);
  const swipeLatestXRef = useRef(0);
  const swipeFrameRef = useRef(null);
  const swipePointerIdRef = useRef(null);

  const startSwipe = (event) => {
    if (disabled || completed) return;
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

    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 0.7) {
      swipeActiveRef.current = false;
      swipeLatestXRef.current = 0;
      setSwipeX(0);
      setIsSwiping(false);
      return;
    }

    if (Math.abs(dx) < 24) return;

    event.preventDefault();

    if (!isSwiping) setIsSwiping(true);

    const limited = Math.max(-118, Math.min(118, dx));
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

    const deleteThreshold = 84;
    const moveTomorrowThreshold = 104;

    if (finalX < -deleteThreshold) {
      onDelete(task);
      return;
    }

    if (finalX > moveTomorrowThreshold) {
      onPostponeTomorrow(task);
    }
  };

  return (
    <div className="relative overflow-visible border-b border-slate-100 last:border-b-0">
      {!completed && !disabled && (
        <div className="absolute inset-y-0 left-0 z-0 flex w-32 items-center justify-start bg-amber-50 px-4 text-amber-600">
          <span className="text-xs font-black">{moveLabel}</span>
        </div>
      )}

      {!completed && !disabled && (
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
        style={swipeX !== 0 ? { transform: `translate3d(${swipeX}px, 0, 0)` } : undefined}
        className="relative z-10 bg-white px-3 py-2 transition-transform duration-200"
      >
        <div className="flex min-h-[48px] items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              if (disabled) return;
              onToggle(task);
            }}
            className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-[1.6px] ${
              completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"
            } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </button>

          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${style.bg}`}>
            <Icon className={`h-5 w-5 ${style.text}`} strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1 touch-manipulation select-none">
            <p className={`flex items-start gap-1 text-[13px] font-bold leading-tight tracking-[-0.01em] ${
              completed ? "text-slate-400" : "text-slate-950"
            }`}>
              <span className="line-clamp-2 break-words">{task.title || "無題のタスク"}</span>
            </p>

            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <div className={`flex items-center gap-1 ${style.text}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                <span className="max-w-[52px] truncate text-[11px] font-black">
                  {task.category ?? "その他"}
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <Clock className="h-3.5 w-3.5" strokeWidth={2.2} />
                <span className="text-[11px] font-bold">
                  {formatMinutes(task.actualMinutes ?? task.workedMinutes ?? task.focusMinutes ?? task.elapsedMinutes ?? 0)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              if (disabled) return;
              onEdit(task);
            }}
            className={`grid h-8 w-7 shrink-0 place-items-center rounded-xl ${
              disabled ? "cursor-not-allowed text-slate-200" : "text-emerald-500 active:bg-emerald-50"
            }`}
          >
            <Pencil className="h-[17px] w-[17px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskSection({ record, disabled = false, moveLabel = "明日へ", onToggleTask, onEditTask, onDeleteTask, onPostponeTomorrow }) {
  const tasks = (record.tasks ?? []).filter((task) => task.taskStatus !== "deleted");
  const incompleteTasks = tasks.filter((task) => !isCompleted(task));
  const completedTasks = tasks.filter((task) => isCompleted(task));

  return (
    <section className="relative z-20 mb-3 overflow-visible rounded-[22px] border border-slate-100 bg-white p-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-500">
          <Check className="h-4.5 w-4.5" strokeWidth={2.5} />
        </div>
        <h2 className="text-[16px] font-black tracking-[-0.03em] text-slate-950">今日のタスク</h2>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-[18px] bg-emerald-50 px-4 py-5 text-center text-[13px] font-bold text-emerald-600">
          この日は記録されたTodoがありません。振り返りは完了扱いです。
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="rounded-[18px] border border-amber-100 bg-amber-50/50 p-2">
            <div className="mb-1.5 flex items-center gap-2 px-1">
              <p className="text-[14px] font-black text-amber-600">未達成</p>
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1.5 text-[11px] font-black text-white">
                {incompleteTasks.length}
              </span>
            </div>

            <div className="overflow-visible rounded-[16px] bg-white">
              {incompleteTasks.length === 0 ? (
                <div className="rounded-[16px] bg-white/75 px-4 py-4 text-center text-[12px] font-bold text-emerald-600">
                  未達成タスクはありません。
                </div>
              ) : (
                incompleteTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    disabled={disabled}
                    moveLabel={moveLabel}
                    onToggle={onToggleTask}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onPostponeTomorrow={onPostponeTomorrow}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-100 bg-slate-50/80 p-2">
            <div className="mb-1.5 flex items-center gap-2 px-1">
              <p className="text-[14px] font-black text-slate-600">達成</p>
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-slate-400 px-1.5 text-[11px] font-black text-white">
                {completedTasks.length}
              </span>
            </div>

            <div className="overflow-visible rounded-[16px] bg-white">
              {completedTasks.length === 0 ? (
                <div className="rounded-[16px] bg-white/75 px-4 py-4 text-center text-[12px] font-bold text-slate-400">
                  達成タスクはまだありません。
                </div>
              ) : (
                completedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    disabled={disabled}
                    moveLabel={moveLabel}
                    onToggle={onToggleTask}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onPostponeTomorrow={onPostponeTomorrow}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function LongTaskSection() {
  return (
    <section className="mb-3 rounded-[22px] border border-emerald-100 bg-emerald-50/40 p-3.5">
      <div className="mb-3 flex items-center gap-2.5">
        <Flag className="h-5 w-5 text-emerald-500" fill="currentColor" />
        <h2 className="text-[16px] font-black tracking-[-0.03em] text-slate-950">長期タスク・メモ</h2>
      </div>
      <div className="rounded-[18px] bg-white p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-black text-slate-950">長期タスクは後で接続予定</p>
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
  const todayKey = getTodayKey();
  const isTodayReview = dateKey === todayKey;
  const moveDateKey = isTodayReview ? getTomorrowKey(dateKey) : todayKey;
  const moveLabel = isTodayReview ? "明日へ" : "今日へ";
  const moveMessage = isTodayReview ? "明日に移動しました" : "今日に移動しました";

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
    const workLog = (appData?.workLogs ?? []).find((log) => log.taskId === task.id);
    const minutes = getInitialActualMinutes(task, workLog);
    const seconds = minutes * 60;

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
              elapsedMinutes: minutes,
              elapsedSeconds: seconds,
              type: "todo",
              reminder: null,
              schedule: null,
            }
          : item
      );

      const nextWorkLogs = [
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
    setTodoModal({ open: true, mode: "edit", todo: task });
  };

  const handleDeleteTask = (task) => {
    if (isConfirmed) return;

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
    if (isConfirmed || isCompleted(task)) return;

    const originalDate = getTaskDateKey(task, dateKey);

    setAppData((current) => {
      const nextTasks = (current.tasks ?? []).map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: false,
              taskStatus: "pending",
              completedAt: null,
              targetDate: moveDateKey,
              date: item.date === originalDate ? moveDateKey : item.date,
              type: "todo",
              reminder: null,
              schedule: null,
            }
          : item
      );
      return { ...current, tasks: nextTasks, dailyRecords: syncCurrentDateRecords(current, nextTasks) };
    });

    showUndoToast({ type: "postpone", message: moveMessage, taskTitle: task.title, task, originalDate, movedDate: moveDateKey });
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
              type: "todo",
              reminder: null,
              schedule: null,
            }
          : task
      );

      const nextWorkLogs = [
        ...(current.workLogs ?? []).filter((item) => item.taskId !== log.taskId),
        { ...log, seconds, id: Date.now(), date: dateKey },
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
              type: "todo",
              reminder: null,
              schedule: null,
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
                type: "todo",
                reminder: null,
                schedule: null,
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
        syncDailyRecordFromTasks(
          current.dailyRecords ?? {},
          dateKey,
          (current.tasks ?? []).filter((task) => getTaskDateKey(task, dateKey) === dateKey)
        ),
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
    <div className="min-h-dvh bg-[#f6f8f7] text-slate-950 antialiased">
      <main className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#fbfcfb] px-[max(12px,env(safe-area-inset-left))] pb-[calc(82px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <AppHeader title={formatJapaneseDate(dateKey)} leftType="back" rightType="none" onBack={() => onNavigate?.("today")} />

        <div className="space-y-2.5 min-[390px]:space-y-3">
          <SummaryCard record={record} />

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

          {!isConfirmed && incompleteTasks.length > 0 && (
            <div className="rounded-[20px] bg-amber-50 px-4 py-3 text-[13px] font-bold leading-5 text-amber-700">
              未達成タスクを「達成・{moveLabel}・削除」のどれかに整理すると、振り返りを完了できます。
            </div>
          )}

          <TaskSection
            record={record}
            disabled={isConfirmed}
            moveLabel={moveLabel}
            onToggleTask={handleToggleTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onPostponeTomorrow={handlePostponeTomorrow}
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