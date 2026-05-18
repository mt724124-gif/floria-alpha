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
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

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


function TaskCard({ task, plannedMinutes, onEdit }) {
  const style = categoryStyles[task?.category] ?? categoryStyles["その他"];
  const Icon = style.icon;

  return (
    <section className="flex h-[64px] shrink-0 items-center justify-between rounded-[21px] border border-slate-100 bg-white px-4 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${style.bg}`}
        >
          <Icon className={`h-6 w-6 ${style.color}`} strokeWidth={2.25} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[17px] font-black tracking-[-0.04em] text-slate-950">
            {task?.title ?? "タスク未選択"}
          </p>

          <p className="mt-0.5 text-xs font-bold text-slate-400">
  {task?.category ?? "その他"}
  {plannedMinutes > 0 && <>・予定 {formatMinutesLabel(plannedMinutes)}</>}
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
        className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-emerald-500 active:bg-emerald-50"
      >
        <Edit3 className="h-5 w-5" strokeWidth={2.4} />
      </button>
    </section>
  );
}

function CircularTimer({ elapsedSeconds, plannedSeconds, plannedMinutes }) {
  const radius = 118;
  const circumference = 2 * Math.PI * radius;
  const progress =
    plannedSeconds === 0 ? 0 : Math.min(elapsedSeconds / plannedSeconds, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <section className="flex min-h-0 shrink items-center justify-center py-[clamp(2px,0.8dvh,8px)]">
      <div className="timer-dial relative grid aspect-square w-[min(58vw,24dvh,230px)] place-items-center">
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 300 300"
        >
          <circle
            cx="150"
            cy="150"
            r={radius}
            fill="none"
            stroke="rgba(16,185,129,0.13)"
            strokeWidth="14"
          />

          <circle
            cx="150"
            cy="150"
            r={radius}
            fill="none"
            stroke="rgb(16,185,129)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>

        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="mb-1.5 text-[11px] font-black text-slate-400">
            経過時間
          </p>

          <p className="timer-clock whitespace-nowrap text-[clamp(30px,5.2dvh,42px)] font-black leading-none tracking-[-0.05em] text-slate-950">
            {formatClock(elapsedSeconds)}
          </p>

          <p className="min-h-[20px] text-sm font-bold text-slate-400">
  {plannedMinutes > 0
    ? `予定時間：${formatMinutesLabel(plannedMinutes)}`
    : ""}
</p>
        </div>
      </div>
    </section>
  );
}

function PauseButton({ isRunning, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex h-[48px] min-w-[142px] items-center justify-center gap-2 rounded-[18px] bg-white px-5 text-[15px] font-black text-emerald-600 shadow-[0_10px_26px_rgba(15,23,42,0.08)] active:scale-[0.98]"
    >
      {isRunning ? (
        <Pause className="h-6 w-6 fill-emerald-500" />
      ) : (
        <Play className="h-6 w-6 fill-emerald-500" />
      )}

      {isRunning ? "一時停止" : "再開"}
    </button>
  );
}

function AnimatedStudyScene({ isRunning }) {
  return (
    <section className="study-scene relative h-[clamp(96px,16dvh,142px)] shrink-0 overflow-hidden rounded-[22px] bg-gradient-to-b from-white via-emerald-50/30 to-white">
      <div className="absolute left-5 top-5 h-14 w-20 rounded-xl border-8 border-white bg-gradient-to-br from-sky-100 to-emerald-100 shadow-sm" />

      <div className="absolute bottom-[32px] left-2 right-2 h-4 rounded-full bg-amber-200/80" />
      <div className="absolute bottom-5 left-6 right-6 h-8 rounded-b-[24px] bg-amber-100" />

      <div className="absolute bottom-[42px] right-9 h-18 w-7 origin-bottom rotate-[25deg] rounded-full bg-slate-300" />
      <div className="absolute bottom-[88px] right-16 h-7 w-14 rounded-full bg-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.22)]" />

      <Coffee
        className={`absolute bottom-[42px] left-[108px] h-7 w-7 text-emerald-700 ${
          isRunning ? "animate-[coffee_5.5s_ease-in-out_infinite]" : ""
        }`}
      />

      <div
        className={`absolute bottom-5 left-1/2 h-24 w-28 -translate-x-1/2 scale-[0.78] min-[390px]:scale-[0.9] ${
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

      <div className="absolute bottom-5 left-[112px] h-9 w-28 rounded-lg bg-white shadow-sm" />
      <div className="absolute bottom-7 left-[124px] h-1 w-16 rounded-full bg-slate-200" />
      <div className="absolute bottom-11 left-[124px] h-1 w-20 rounded-full bg-slate-200" />

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

  @media (min-width: 500px) and (max-height: 760px) {
    .timer-shell {
      gap: 6px;
    }

    .timer-control-area {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 14px;
      padding-left: 18px;
      padding-right: 18px;
    }

    .timer-action-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .timer-dial {
      width: min(34dvh, 210px, 42vw);
    }

    .timer-clock {
      font-size: clamp(34px, 6dvh, 44px);
    }

    .study-scene {
      height: clamp(86px, 15dvh, 120px);
    }
  }

  @media (max-height: 620px) {
    .timer-dial {
      width: min(32dvh, 190px, 44vw);
    }

    .timer-clock {
      font-size: clamp(32px, 5.5dvh, 40px);
    }

    .study-scene {
      height: 86px;
    }
  }

  @media (max-height: 620px) {
  .study-scene {
    display: none;
  }
}
`}</style>
    </section>
  );
}

function MiniProgressCard({ focusMinutes = 0, plannedMinutes = 0 }) {
  const rate =
    plannedMinutes === 0
      ? 0
      : Math.min(100, Math.round((focusMinutes / plannedMinutes) * 100));

  return (
    <section className="shrink-0 rounded-[20px] border border-slate-100 bg-white px-4 py-2 shadow-[0_10px_26px_rgba(15,23,42,0.055)]">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[13px] font-black text-slate-950">今日の集中</p>

        <p className="text-[13px] font-black text-emerald-600">
          {formatMinutesLabel(focusMinutes)}
        </p>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
    </section>
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

  const plannedMinutes = Number(localTask?.estimatedMinutes) > 0 ? Number(localTask.estimatedMinutes) : 0;
const plannedSeconds = plannedMinutes * 60;

  const elapsedMinutes = useMemo(
    () => Math.max(0, Math.round(elapsedSeconds / 60)),
    [elapsedSeconds]
  );

  useEffect(() => {
    const initialSeconds = getInitialActualSeconds(task);

    setLocalTask(task);
    setElapsedSeconds(initialSeconds);
    setIsRunning(true);

    startedAtRef.current = Date.now() - initialSeconds * 1000;
    hasSavedRef.current = false;
  }, [task?.id, task?.actualSeconds, task?.actualMinutes, task?.workedMinutes, task?.focusMinutes, task?.elapsedMinutes]);

  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    };

    tick();

    const timerId = window.setInterval(tick, 1000);

    return () => window.clearInterval(timerId);
  }, [isRunning]);

  const pauseTimer = () => {
  saveProgress();
  setIsRunning(false);
};

  const resumeTimer = () => {
    startedAtRef.current = Date.now() - elapsedSeconds * 1000;
    setIsRunning(true);
  };

  const toggleTimer = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

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
  if (!localTask?.id) return;

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

  const editedSeconds = getInitialActualSeconds(mergedTask);

  setLocalTask(mergedTask);
  setElapsedSeconds(editedSeconds);

  if (isRunning) {
    startedAtRef.current = Date.now() - editedSeconds * 1000;
  }

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
    <div className="h-dvh overflow-hidden bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="timer-shell mx-auto flex h-dvh w-full max-w-[480px] flex-col gap-[clamp(5px,0.8dvh,9px)] overflow-hidden bg-[#fbfcfb] px-[max(12px,env(safe-area-inset-left))] pb-[calc(8px+env(safe-area-inset-bottom))] pt-[calc(10px+env(safe-area-inset-top))]">
        

        <TaskCard
          task={localTask}
          plannedMinutes={plannedMinutes}
          onEdit={() => setIsEditModalOpen(true)}
        />

        <div className="timer-control-area grid shrink-0 items-center gap-1.5">
          <CircularTimer
            elapsedSeconds={elapsedSeconds}
            plannedSeconds={plannedSeconds}
            plannedMinutes={plannedMinutes}
          />

          <div className="timer-action-area flex flex-col items-center gap-1.5">
            <PauseButton isRunning={isRunning} onToggle={toggleTimer} />

            <button
              onClick={handleClose}
              className="mx-auto flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-2xl px-4 text-[12px] font-black text-slate-400 active:bg-slate-100"
            >
              <Home className="h-4 w-4" />
              ホームに戻る
            </button>
          </div>
        </div>

        <AnimatedStudyScene isRunning={isRunning} />

        <MiniProgressCard
          focusMinutes={elapsedMinutes}
          plannedMinutes={plannedMinutes}
        />

        <button
          onClick={completeWork}
          className="flex h-[50px] shrink-0 items-center justify-center gap-2.5 rounded-[21px] bg-emerald-500 text-[16px] font-black text-white shadow-[0_12px_24px_rgba(16,185,129,0.28)] active:scale-[0.985]"
        >
          <CheckCircle2 className="h-6 w-6" />
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