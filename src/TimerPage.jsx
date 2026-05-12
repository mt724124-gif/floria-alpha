import React, { useEffect, useMemo, useRef, useState } from "react";
import TodoModal from "./components/TodoModal";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Coffee,
  Dumbbell,
  Edit3,
  Home,
  Menu,
  Pause,
  Play,
  Target,
  X,
} from "lucide-react";

const categoryStyles = {
  学習: { icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-50" },
  仕事: { icon: Briefcase, color: "text-blue-500", bg: "bg-blue-50" },
  健康: { icon: Dumbbell, color: "text-violet-500", bg: "bg-violet-50" },
  その他: { icon: CalendarDays, color: "text-slate-500", bg: "bg-slate-50" },
};

const initialCategories = ["学習", "仕事", "健康", "その他"];

function formatMinutesLabel(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function formatClock(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function getInitialActualSeconds(task) {
  if (task?.actualSeconds != null) {
    return Math.max(0, Math.round(Number(task.actualSeconds)));
  }

  const minutes =
    task?.actualMinutes ??
    task?.workedMinutes ??
    task?.focusMinutes ??
    task?.elapsedMinutes ??
    0;

  return Math.max(0, Math.round(Number(minutes) * 60));
}

function TimerHeader({ onClose }) {
  return (
    <header className="mb-5 flex h-14 items-center justify-between px-1">
      <button
        onClick={onClose}
        className="grid h-11 w-11 place-items-center rounded-2xl text-slate-950 active:bg-slate-100"
      >
        <X className="h-8 w-8" strokeWidth={2.4} />
      </button>

      <h1 className="text-[22px] font-black tracking-[-0.04em] text-slate-950">
        タイマー
      </h1>

      <button className="grid h-11 w-11 place-items-center rounded-2xl text-slate-950 active:bg-slate-100">
        <Menu className="h-8 w-8" strokeWidth={2.4} />
      </button>
    </header>
  );
}

function TaskCard({ task, plannedMinutes, onEdit }) {
  const style = categoryStyles[task?.category] ?? categoryStyles["その他"];
  const Icon = style.icon;

  return (
    <section className="mb-7 flex h-[86px] items-center justify-between rounded-[24px] border border-slate-100 bg-white px-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${style.bg}`}
        >
          <Icon className={`h-7 w-7 ${style.color}`} strokeWidth={2.25} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[20px] font-black tracking-[-0.04em] text-slate-950">
            {task?.title ?? "タスク未選択"}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            {task?.category ?? "その他"}・予定 {formatMinutesLabel(plannedMinutes)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!task) return;
          onEdit?.();
        }}
        className="relative z-20 grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-emerald-500 active:bg-emerald-50"
      >
        <Edit3 className="h-6 w-6" strokeWidth={2.4} />
      </button>
    </section>
  );
}

function CircularTimer({ elapsedSeconds, plannedSeconds, plannedMinutes }) {
  const radius = 126;
  const circumference = 2 * Math.PI * radius;
  const progress =
    plannedSeconds === 0 ? 0 : Math.min(elapsedSeconds / plannedSeconds, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <section className="mb-5 flex flex-col items-center">
      <div className="relative grid h-[310px] w-[310px] place-items-center">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 310 310">
          <circle
            cx="155"
            cy="155"
            r={radius}
            fill="none"
            stroke="rgba(16,185,129,0.13)"
            strokeWidth="15"
          />
          <circle
            cx="155"
            cy="155"
            r={radius}
            fill="none"
            stroke="rgb(16,185,129)"
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>

        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="mb-4 text-[14px] font-black text-slate-400">経過時間</p>
          <p className="text-[64px] font-black leading-none tracking-[-0.06em] text-slate-950">
            {formatClock(elapsedSeconds)}
          </p>

          <p className="mt-6 text-[16px] font-bold text-slate-400">
            予定時間 {plannedMinutes}分
          </p>
        </div>
      </div>
    </section>
  );
}

function PauseButton({ isRunning, onToggle }) {
  return (
    <div className="mb-3 flex justify-center">
      <button
        onClick={onToggle}
        className="flex h-[58px] min-w-[170px] items-center justify-center gap-3 rounded-[20px] bg-white px-7 text-[18px] font-black text-emerald-600 shadow-[0_14px_34px_rgba(15,23,42,0.08)] active:scale-[0.98]"
      >
        {isRunning ? (
          <Pause className="h-7 w-7 fill-emerald-500" />
        ) : (
          <Play className="h-7 w-7 fill-emerald-500" />
        )}
        {isRunning ? "一時停止" : "再開"}
      </button>
    </div>
  );
}

function AnimatedStudyScene({ isRunning }) {
  return (
    <section className="relative mb-3 h-[250px] overflow-hidden rounded-[26px] bg-gradient-to-b from-white via-emerald-50/30 to-white">
      <div className="absolute left-5 top-10 h-24 w-24 rounded-xl border-8 border-white bg-gradient-to-br from-sky-100 to-emerald-100 shadow-sm" />

      <div className="absolute bottom-[56px] left-2 right-2 h-5 rounded-full bg-amber-200/80" />
      <div className="absolute bottom-10 left-6 right-6 h-12 rounded-b-[28px] bg-amber-100" />

      <div className="absolute bottom-[72px] right-10 h-28 w-8 origin-bottom rotate-[25deg] rounded-full bg-slate-300" />
      <div className="absolute bottom-[144px] right-20 h-8 w-16 rounded-full bg-emerald-200 shadow-[0_0_28px_rgba(16,185,129,0.25)]" />

      <Coffee
        className={`absolute bottom-[72px] left-32 h-8 w-8 text-emerald-700 ${
          isRunning ? "animate-[coffee_5.5s_ease-in-out_infinite]" : ""
        }`}
      />

      <div
        className={`absolute bottom-16 left-1/2 h-28 w-32 -translate-x-1/2 ${
          isRunning
            ? "animate-[studyBob_2.4s_ease-in-out_infinite]"
            : "animate-[pauseLook_3s_ease-in-out_infinite]"
        }`}
      >
        <div className="absolute left-10 top-0 h-16 w-16 rounded-full bg-[#f4c7a5]" />
        <div className="absolute left-7 top-[-4px] h-13 w-22 rounded-t-full bg-[#2d221f]" />
        <div className="absolute left-[60px] top-8 h-2 w-2 rounded-full bg-slate-950" />
        <div className="absolute left-[92px] top-8 h-2 w-2 rounded-full bg-slate-950" />
        <div className="absolute left-[76px] top-12 h-2 w-5 rounded-b-full border-b-2 border-slate-700" />
        <div className="absolute left-5 top-13 h-18 w-26 rounded-t-[28px] bg-emerald-500" />
        <div className="absolute left-1 top-24 h-5 w-20 -rotate-12 rounded-full bg-[#f4c7a5]" />
        <div
          className={`absolute left-2 top-26 h-2 w-15 -rotate-30 rounded-full bg-slate-800 ${
            isRunning ? "animate-[penMove_0.8s_ease-in-out_infinite]" : ""
          }`}
        />
        <div className="absolute left-18 top-26 h-5 w-20 rotate-8 rounded-full bg-[#f4c7a5]" />
      </div>

      <div className="absolute bottom-10 left-[120px] h-14 w-32 rounded-lg bg-white shadow-sm" />
      <div className="absolute bottom-12 left-[132px] h-1 w-18 rounded-full bg-slate-200" />
      <div className="absolute bottom-17 left-[132px] h-1 w-22 rounded-full bg-slate-200" />

      <style>{`
        @keyframes studyBob {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(3px); }
        }
        @keyframes penMove {
          0%, 100% { transform: rotate(-24deg) translateX(0); }
          50% { transform: rotate(-34deg) translateX(5px); }
        }
        @keyframes pauseLook {
          0%, 100% { transform: translateX(-50%) translateY(0) rotate(0deg); }
          50% { transform: translateX(-50%) translateY(-2px) rotate(-2deg); }
        }
        @keyframes coffee {
          0%, 75%, 100% { transform: translateY(0) rotate(0deg); }
          85% { transform: translateY(-8px) rotate(-8deg); }
        }
      `}</style>
    </section>
  );
}

function ProgressCard({ completedCount = 1, totalCount = 3, focusMinutes = 0 }) {
  const rate = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <section className="mb-5 rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
      <div className="mb-5 flex items-center gap-2.5">
        <Target className="h-6 w-6 text-emerald-500" strokeWidth={2.3} />
        <h2 className="text-[18px] font-black tracking-[-0.03em] text-slate-950">
          今日の進捗
        </h2>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
        <Stat label="完了タスク" value={`${completedCount} / ${totalCount}`} />
        <Stat label="集中時間" value={formatMinutesLabel(focusMinutes)} />
        <Stat label="達成率" value={`${rate}%`} />
      </div>

      <div className="mt-5 h-3.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="px-1">
      <p className="mb-2 text-[12px] font-black text-slate-700">{label}</p>
      <p className="text-[22px] font-black tracking-[-0.04em] text-slate-950">
        {value}
      </p>
    </div>
  );
}

export default function TimerPage({
  task,
  onClose,
  onComplete,
  onSaveProgress,
  onUpdateTask,
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [localTask, setLocalTask] = useState(task);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    getInitialActualSeconds(task)
  );
  const [isRunning, setIsRunning] = useState(true);

  const startedAtRef = useRef(Date.now());
  const hasSavedRef = useRef(false);

  const plannedMinutes = localTask?.estimatedMinutes ?? 25;
  const plannedSeconds = plannedMinutes * 60;

  const elapsedMinutes = useMemo(
    () => Math.max(0, Math.round(elapsedSeconds / 60)),
    [elapsedSeconds]
  );

  useEffect(() => {
    setLocalTask(task);
    setElapsedSeconds(getInitialActualSeconds(task));
    setIsRunning(true);
    startedAtRef.current = Date.now();
    hasSavedRef.current = false;
  }, [task?.id]);

  useEffect(() => {
    if (!isRunning) return;

    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isRunning]);

  const buildResult = (completed) => ({
    task: localTask,
    completed,
    actualMinutes: elapsedMinutes,
    actualSeconds: elapsedSeconds,
    plannedMinutes,
    startedAt: startedAtRef.current,
    endedAt: Date.now(),
  });

  const saveProgress = () => {
    if (!localTask?.id || hasSavedRef.current) return;

    hasSavedRef.current = true;
    const result = buildResult(false);

    if (onSaveProgress) {
      onSaveProgress(result);
    } else {
      onComplete?.(result);
    }
  };

  const handleClose = () => {
    saveProgress();
    onClose?.();
  };

  const completeWork = () => {
    if (!localTask?.id || hasSavedRef.current) return;

    hasSavedRef.current = true;
    onComplete?.(buildResult(true));
    onClose?.();
  };

  const saveEditedTask = (updatedTask) => {
    const mergedTask = {
      ...localTask,
      ...updatedTask,
      id: localTask?.id,
    };

    setLocalTask(mergedTask);
    onUpdateTask?.(mergedTask);
    setIsEditModalOpen(false);
  };

  const addCategory = (category) => {
    setCategories((current) =>
      current.includes(category) ? current : [...current, category]
    );
  };

  const deleteCategory = (category) => {
    if (category === "その他") return;

    setCategories((current) => current.filter((item) => item !== category));

    if (localTask?.category === category) {
      const updatedTask = {
        ...localTask,
        category: "その他",
      };
      setLocalTask(updatedTask);
      onUpdateTask?.(updatedTask);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfcfb] text-slate-950 antialiased">
      <div className="mx-auto min-h-screen w-full max-w-[390px] px-4 pb-8 pt-4">
        <TimerHeader onClose={handleClose} />

        <TaskCard
          task={localTask}
          plannedMinutes={plannedMinutes}
          onEdit={() => setIsEditModalOpen(true)}
        />

        <CircularTimer
          elapsedSeconds={elapsedSeconds}
          plannedSeconds={plannedSeconds}
          plannedMinutes={plannedMinutes}
        />

        <PauseButton
          isRunning={isRunning}
          onToggle={() => setIsRunning((current) => !current)}
        />

        <button
          onClick={handleClose}
          className="mx-auto mb-4 flex h-10 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-slate-400 active:bg-slate-100"
        >
          <Home className="h-4 w-4" />
          ホームに戻る
        </button>

        <AnimatedStudyScene isRunning={isRunning} />

        <ProgressCard completedCount={1} totalCount={3} focusMinutes={elapsedMinutes} />

        <button
          onClick={completeWork}
          className="flex h-[64px] w-full items-center justify-center gap-3 rounded-[22px] bg-emerald-500 text-[20px] font-black text-white shadow-[0_14px_26px_rgba(16,185,129,0.28)] active:scale-[0.985]"
        >
          <CheckCircle2 className="h-7 w-7" />
          作業を完了する
        </button>
      </div>

      <TodoModal
        open={isEditModalOpen}
        mode="edit"
        initialTodo={localTask}
        categories={categories}
        onClose={() => setIsEditModalOpen(false)}
        onSave={saveEditedTask}
        onAddCategory={addCategory}
        onDeleteCategory={deleteCategory}
        compactTimerEdit={true}
      />
    </div>
  );
}