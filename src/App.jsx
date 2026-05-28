import { useEffect, useState } from "react";
import TodayPage from "./TodayPage";
import TimerPage from "./TimerPage";
import CalendarPage from "./CalendarPage";
import StatsPageDay from "./StatsPage_day";
import SetPage from "./SetPage";
import ReviewPage from "./ReviewPage";
import AIPage from "./AIPage";
import { updateDailyRecordTask } from "./utils/dailyRecords";

const STORAGE_KEY = "todo-app-data-v1";

function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

function getTaskDateKey(task) {
  return (
    task?.targetDate ??
    task?.date ??
    task?.createdDate ??
    task?.schedule?.date ??
    getTodayKey()
  );
}

function isFutureDateKey(dateKey) {
  return String(dateKey) > getTodayKey();
}

function formatJapaneseDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function isReviewConfirmed(record) {
  return record?.status === "confirmed" || record?.reviewCompleted === true;
}

function hasReviewTasksForDate(appData, dateKey) {
  const recordTasks = appData?.dailyRecords?.[dateKey]?.tasks ?? [];

  if (recordTasks.some((task) => task?.taskStatus !== "deleted")) {
    return true;
  }

  const normalTasks = (appData?.tasks ?? []).some(
    (task) =>
      getTaskDateKey(task) === dateKey &&
      task?.type !== "longDailyReview" &&
      task?.type !== "longDaily" &&
      task?.taskStatus !== "deleted"
  );

  if (normalTasks) return true;

  return (appData?.longTasks ?? []).some((longTask) => {
    const plan = (longTask.dailyPlans ?? []).find((row) => row.date === dateKey);
    if (!plan) return false;

    if (Array.isArray(plan.tasks)) {
      return plan.tasks.some(
        (task) =>
          task?.selected !== false &&
          task?.reviewOnly !== true &&
          task?.taskStatus !== "deleted" &&
          String(task?.title ?? "").trim()
      );
    }

    return String(plan.title ?? "").trim();
  });
}

function findOldestIncompletePastReviewDateKey(appData) {
  const todayKey = getTodayKey();
  const dateKeys = new Set();

  Object.keys(appData?.dailyRecords ?? {}).forEach((dateKey) => {
    if (dateKey < todayKey) dateKeys.add(dateKey);
  });

  (appData?.tasks ?? []).forEach((task) => {
    const dateKey = getTaskDateKey(task);
    if (dateKey < todayKey) dateKeys.add(dateKey);
  });

  (appData?.longTasks ?? []).forEach((longTask) => {
    (longTask.dailyPlans ?? []).forEach((plan) => {
      if (plan.date && plan.date < todayKey) dateKeys.add(plan.date);
    });
  });

  return (
    [...dateKeys]
      .sort()
      .find((dateKey) => {
        const record = appData?.dailyRecords?.[dateKey];
        return !isReviewConfirmed(record) && hasReviewTasksForDate(appData, dateKey);
      }) ?? null
  );
}

function loadSavedData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (error) {
    console.error("保存データの読み込みに失敗しました", error);
    return null;
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("保存データの書き込みに失敗しました", error);
  }
}

function createId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isLongDailyReviewTask(task) {
  return task?.isLongTask === true || task?.type === "longDailyReview";
}

function getLongDailyTaskKey(task) {
  return task?.longDailyTaskId ?? task?.sourceLongDailyTaskId ?? task?.id ?? null;
}

function normalizeTaskStatus(item) {
  if (item?.taskStatus === "completed" || item?.completed === true) return "completed";
  if (item?.taskStatus === "postponed") return "postponed";
  return "pending";
}

function normalizeLongSubTask(item = {}, date = "", index = 0, longTaskId = "") {
  const completed = item.taskStatus === "completed" || item.completed === true;
  const id = item.id ?? `${longTaskId || "long"}-${date || "date"}-${index}-${createId()}`;

  return {
    ...item,
    id,
    title: item.title ?? "",
    detail: item.detail ?? item.memo ?? "",
    memo: item.memo ?? item.detail ?? "",
    estimatedMinutes:
      item.estimatedMinutes === "" || item.estimatedMinutes == null
        ? null
        : Number(item.estimatedMinutes),
    actualMinutes: item.actualMinutes ?? null,
    actualSeconds: item.actualSeconds ?? null,
    completed,
    taskStatus: completed ? "completed" : normalizeTaskStatus(item),
    completedAt: completed ? item.completedAt ?? null : null,
    selected: item.selected ?? true,
    status: item.status ?? normalizeTaskStatus(item),
  };
}

function normalizeDailyPlan(plan = {}, longTaskId = "") {
  const date = plan.date ?? "";

  if (Array.isArray(plan.tasks)) {
    return {
      ...plan,
      id: plan.id ?? `${longTaskId}-${date}`,
      date,
      selected: plan.selected ?? true,
      tasks: plan.tasks.map((item, index) =>
        normalizeLongSubTask(item, date, index, longTaskId)
      ),
    };
  }

  const hasOldSingleTask =
    String(plan.title ?? "").trim() ||
    String(plan.detail ?? plan.memo ?? "").trim() ||
    plan.estimatedMinutes != null;

  if (hasOldSingleTask) {
    return {
      id: plan.id ?? `${longTaskId}-${date}`,
      date,
      selected: plan.selected ?? true,
      tasks: [normalizeLongSubTask(plan, date, 0, longTaskId)],
    };
  }

  return {
    ...plan,
    id: plan.id ?? `${longTaskId}-${date}`,
    date,
    selected: plan.selected ?? true,
    tasks: [],
  };
}

function createInitialAppData() {
  return {
    tasks: [],
    categories: ["学習", "仕事", "健康", "その他"],
    workLogs: [],
    timerSessions: [],
    dailyRecords: {},
    longTasks: [],
    aiLongTaskDrafts: [],
    settings: {},
    ...(loadSavedData() ?? {}),
  };
}

function normalizeLongTasksFromAI(tasks) {
  const categoryColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-violet-500",
    "bg-cyan-500",
  ];

  return (tasks ?? []).map((task, index) => {
    const id = task.id ?? createId();
    const start = task.start ?? task.startDate ?? task.start_date ?? "";
    const end = task.end ?? task.endDate ?? task.end_date ?? task.deadline ?? "";

    return {
      ...task,
      id,
      source: task.source ?? "ai",
      title: task.title ?? `長期タスク${index + 1}`,
      start,
      end,
      startDate: start,
      endDate: end,
      category: task.category ?? "AI",
      color: task.color ?? categoryColors[index % categoryColors.length],
      estimatedMinutes: Number(task.estimatedMinutes ?? 0) || 0,
      progress: task.progress ?? 0,
      status: task.status ?? "進行前",
      createdAt: task.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dailyPlans: (task.dailyPlans ?? []).map((plan) => normalizeDailyPlan(plan, id)),
    };
  });
}

function updateLongDailyTaskInLongTasks(longTasks, sourceTask, patchOrUpdater) {
  if (!isLongDailyReviewTask(sourceTask)) return longTasks ?? [];

  const parentId = sourceTask.parentId;
  const targetDateKey = getTaskDateKey(sourceTask);
  const longDailyTaskKey = getLongDailyTaskKey(sourceTask);

  if (!parentId || !targetDateKey || !longDailyTaskKey) return longTasks ?? [];

  return (longTasks ?? []).map((longTask) => {
    if (String(longTask.id) !== String(parentId)) return longTask;

    const nextDailyPlans = (longTask.dailyPlans ?? []).map((rawPlan) => {
      const plan = normalizeDailyPlan(rawPlan, longTask.id);

      if (plan.date !== targetDateKey) return plan;

      return {
        ...plan,
        tasks: (plan.tasks ?? []).map((item, index) => {
          const itemId = item.id ?? `${longTask.id}-${targetDateKey}-${index}`;

          if (String(itemId) !== String(longDailyTaskKey)) return item;

          const patch =
            typeof patchOrUpdater === "function"
              ? patchOrUpdater(item)
              : patchOrUpdater;

          const nextItem = {
            ...item,
            ...patch,
          };

          const nextStatus =
            nextItem.taskStatus ??
            (nextItem.completed === true ? "completed" : item.taskStatus ?? "pending");

          const completed = nextStatus === "completed" || nextItem.completed === true;

          return {
            ...nextItem,
            completed,
            taskStatus: completed ? "completed" : nextStatus,
            completedAt: completed ? nextItem.completedAt ?? new Date().toISOString() : null,
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    });

    return {
      ...longTask,
      dailyPlans: nextDailyPlans,
      updatedAt: new Date().toISOString(),
    };
  });
}

function syncLongPatchToTaskList(tasks, sourceTask, patch) {
  const sourceId = sourceTask?.id;
  if (!sourceId) return tasks ?? [];

  return (tasks ?? []).map((task) => {
    if (String(task.id) !== String(sourceId)) return task;

    const nextTask = {
      ...task,
      ...patch,
    };

    const completed =
      nextTask.taskStatus === "completed" || nextTask.completed === true;

    return {
      ...nextTask,
      completed,
      taskStatus: completed ? "completed" : nextTask.taskStatus ?? "pending",
      completedAt: completed ? nextTask.completedAt ?? new Date().toISOString() : null,
    };
  });
}

export default function App() {
  const [screen, setScreen] = useState("today");
  const [timerTask, setTimerTask] = useState(null);
  const [taskUpdateRequest, setTaskUpdateRequest] = useState(null);
  const [reviewDateKey, setReviewDateKey] = useState(getTodayKey());
const [todayInitialDateKey, setTodayInitialDateKey] = useState(null);
const [forcedReviewDateKey, setForcedReviewDateKey] = useState(null);

  const [appData, setAppData] = useState(createInitialAppData);

  useEffect(() => {
    saveData(appData);
  }, [appData]);

  const updateAppData = (updater) => {
    setAppData((current) => {
      return typeof updater === "function" ? updater(current) : updater;
    });
  };

  const openTimer = (task) => {
    const taskDateKey = getTaskDateKey(task);

    if (isFutureDateKey(taskDateKey)) {
      return;
    }

    setTimerTask(task);
    setScreen("timer");
  };

  const closeTimer = () => {
    setTimerTask(null);
    setScreen("today");
  };

  const saveTimerResultToAppData = (result) => {
    const sourceTask = result?.task;
    const sessionDate = getTaskDateKey(sourceTask);

    const actualMinutes = Math.max(
      0,
      Number(
        result?.actualMinutes ??
          (result?.actualSeconds != null
            ? Math.round(Number(result.actualSeconds) / 60)
            : 0)
      )
    );

    const actualSeconds = Math.max(
      0,
      Number(result?.actualSeconds ?? actualMinutes * 60)
    );

    const plannedMinutes = Number(
      result?.plannedMinutes ?? sourceTask?.estimatedMinutes ?? 0
    );

    const completed = result?.completed === true;

    const patch = {
      actualMinutes,
      actualSeconds,
      workedMinutes: actualMinutes,
      focusMinutes: actualMinutes,
      elapsedMinutes: actualMinutes,
      elapsedSeconds: actualSeconds,
      completed: completed ? true : sourceTask?.completed ?? false,
      taskStatus: completed ? "completed" : sourceTask?.taskStatus ?? "pending",
      completedAt: completed ? new Date().toISOString() : sourceTask?.completedAt ?? null,
      usedTimer: true,
    };

    const session = {
      id: createId(),
      taskId: sourceTask?.id,
      taskTitle: sourceTask?.title,
      category: sourceTask?.category,
      date: sessionDate,
      actualMinutes,
      actualSeconds,
      plannedMinutes,
      completed,
      startedAt: result?.startedAt ?? null,
      endedAt: result?.endedAt ?? Date.now(),
      createdAt: new Date().toISOString(),
    };

    updateAppData((current) => {
      const nextTimerSessions = [...(current.timerSessions ?? []), session];

      const timerSessionCount = nextTimerSessions.filter(
        (item) => item.taskId === sourceTask?.id && item.date === sessionDate
      ).length;

      const patchWithSession = {
        ...patch,
        timerSessionCount,
      };

      const nextTasks = syncLongPatchToTaskList(
        (current.tasks ?? []).map((task) => {
          if (String(task.id) !== String(sourceTask?.id)) return task;

          const nextTask = {
            ...task,
            ...patchWithSession,
          };

          const taskCompleted =
            nextTask.taskStatus === "completed" || nextTask.completed === true;

          return {
            ...nextTask,
            completed: taskCompleted,
            taskStatus: taskCompleted ? "completed" : "pending",
            completedAt: taskCompleted ? nextTask.completedAt ?? new Date().toISOString() : null,
          };
        }),
        sourceTask,
        patchWithSession
      );

      const nextLongTasks = updateLongDailyTaskInLongTasks(
        current.longTasks ?? [],
        sourceTask,
        patchWithSession
      );

      const updatedTask = {
        ...sourceTask,
        ...patchWithSession,
      };

      const nextDailyRecords = updateDailyRecordTask(
        current.dailyRecords ?? {},
        sessionDate,
        updatedTask,
        {
          actualMinutes,
          actualSeconds,
          completed,
          taskStatus: completed ? "completed" : "pending",
          completedAt: completed ? patchWithSession.completedAt : null,
          usedTimer: true,
          timerSessionCount,
        }
      );

      const nextWorkLogs = [
        ...(current.workLogs ?? []).filter((log) => log.taskId !== sourceTask?.id),
        {
          id: Date.now(),
          taskId: sourceTask?.id,
          taskTitle: sourceTask?.title,
          category: sourceTask?.category,
          minutes: actualMinutes,
          seconds: actualSeconds,
          date: sessionDate,
        },
      ];

      return {
        ...current,
        tasks: nextTasks,
        longTasks: nextLongTasks,
        workLogs: nextWorkLogs,
        timerSessions: nextTimerSessions,
        dailyRecords: nextDailyRecords,
      };
    });

    return {
      ...result,
      actualMinutes,
      actualSeconds,
      plannedMinutes,
    };
  };

  const handleTimerResult = (result) => {
    saveTimerResultToAppData(result);
    setTimerTask(null);
    setScreen("today");
  };

  const handleTimerProgress = (result) => {
    const normalizedResult = saveTimerResultToAppData(result);

    setTimerTask((current) =>
      String(current?.id) === String(normalizedResult.task?.id)
        ? {
            ...current,
            actualMinutes: normalizedResult.actualMinutes,
            actualSeconds: normalizedResult.actualSeconds,
            workedMinutes: normalizedResult.actualMinutes,
            focusMinutes: normalizedResult.actualMinutes,
            elapsedMinutes: normalizedResult.actualMinutes,
            elapsedSeconds: normalizedResult.actualSeconds,
          }
        : current
    );
  };

  const updateTaskFromTimer = (updatedTask) => {
    setTimerTask(updatedTask);
    setTaskUpdateRequest(updatedTask);

    updateAppData((current) => {
      const patch = {
        ...updatedTask,
        completed:
          updatedTask?.taskStatus === "completed" || updatedTask?.completed === true,
        taskStatus:
          updatedTask?.taskStatus === "completed" || updatedTask?.completed === true
            ? "completed"
            : updatedTask?.taskStatus ?? "pending",
        completedAt:
          updatedTask?.taskStatus === "completed" || updatedTask?.completed === true
            ? updatedTask?.completedAt ?? new Date().toISOString()
            : null,
      };

      return {
        ...current,
        tasks: syncLongPatchToTaskList(current.tasks ?? [], updatedTask, patch),
        longTasks: updateLongDailyTaskInLongTasks(current.longTasks ?? [], updatedTask, patch),
      };
    });
  };

  const updateTaskEverywhere = (sourceTask, patch = {}) => {
  if (!sourceTask?.id) return;

  const targetDateKey = getTaskDateKey(sourceTask);

  updateAppData((current) => {
    const nextTask = {
      ...sourceTask,
      ...patch,
    };

    const completed =
      nextTask.taskStatus === "completed" || nextTask.completed === true;

    const normalizedTask = {
      ...nextTask,
      completed,
      taskStatus: completed ? "completed" : nextTask.taskStatus ?? "pending",
      completedAt: completed ? nextTask.completedAt ?? new Date().toISOString() : null,
    };

    const nextTasks = isLongDailyReviewTask(sourceTask)
      ? current.tasks ?? []
      : (current.tasks ?? []).map((task) =>
          String(task.id) === String(sourceTask.id) ? normalizedTask : task
        );

    const nextLongTasks = isLongDailyReviewTask(sourceTask)
  ? updateLongDailyTaskInLongTasks(current.longTasks ?? [], sourceTask, normalizedTask)
  : current.longTasks ?? [];

    const nextDailyRecords = updateDailyRecordTask(
      current.dailyRecords ?? {},
      targetDateKey,
      normalizedTask,
      {
        estimatedMinutes: normalizedTask.estimatedMinutes,
        actualMinutes: normalizedTask.actualMinutes,
        actualSeconds: normalizedTask.actualSeconds,
        completed: normalizedTask.completed,
        taskStatus: normalizedTask.taskStatus,
        completedAt: normalizedTask.completedAt,
        priority: normalizedTask.priority ?? "medium",
        rank: normalizedTask.rank,
      }
    );

    return {
      ...current,
      tasks: nextTasks,
      longTasks: nextLongTasks,
      dailyRecords: nextDailyRecords,
    };
  });
};

  const handleSaveLongTasksFromAI = (longTasks) => {
  const normalizedLongTasks = normalizeLongTasksFromAI(longTasks);

  updateAppData((current) => ({
    ...current,
    longTasks: [...(current.longTasks ?? []), ...normalizedLongTasks],
    aiLongTaskDrafts: normalizedLongTasks,
  }));

  setScreen("calendar");
};

const incompletePastReviewDateKey = findOldestIncompletePastReviewDateKey(appData);
const shouldShowIncompleteReviewPopup =
  screen === "today" &&
  incompletePastReviewDateKey &&
  screen !== "review";

return (
    <>
      {screen === "today" && (
        <TodayPage
  initialDateKey={todayInitialDateKey}
  onOpenTimer={openTimer}
  taskUpdateRequest={taskUpdateRequest}
  onTaskUpdateHandled={() => setTaskUpdateRequest(null)}
  appData={appData}
  setAppData={updateAppData}
  onUpdateTaskEverywhere={updateTaskEverywhere}
  onNavigate={setScreen}
  onOpenReview={(dateKey) => {
    setReviewDateKey(dateKey);
    setScreen("review");
  }}
/>
      )}

      {screen === "calendar" && (
        <CalendarPage
          appData={appData}
          setAppData={updateAppData}
          onNavigate={setScreen}
        />
      )}

      {screen === "stats" && (
        <StatsPageDay appData={appData} onNavigate={setScreen} />
      )}

      {screen === "ai" && (
        <AIPage
          appData={appData}
          setAppData={updateAppData}
          onNavigate={setScreen}
          onBack={() => setScreen("today")}
          onSaveLongTasks={handleSaveLongTasksFromAI}
        />
      )}

      {screen === "review" && (
        <ReviewPage
  dateKey={reviewDateKey}
  appData={appData}
  setAppData={updateAppData}
  onNavigate={(nextScreen) => {
    if (nextScreen === "today") {
      if (forcedReviewDateKey && reviewDateKey === forcedReviewDateKey) {
        setForcedReviewDateKey(null);
      }

      setTodayInitialDateKey(reviewDateKey);
    }
    setScreen(nextScreen);
  }}
/>
      )}

      {screen === "settings" && <SetPage onNavigate={setScreen} />}

            {screen === "timer" && (
        <TimerPage
          task={timerTask}
          onClose={closeTimer}
          onComplete={handleTimerResult}
          onSaveProgress={handleTimerProgress}
          onUpdateTask={updateTaskFromTimer}
        />
      )}

      {shouldShowIncompleteReviewPopup && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="mb-4 rounded-[22px] bg-amber-50 px-4 py-3">
              <p className="text-[12px] font-black text-amber-600">
                未完了の振り返りがあります
              </p>
              <h2 className="mt-1 text-[21px] font-black tracking-[-0.04em] text-slate-950">
                {formatJapaneseDateKey(incompletePastReviewDateKey)}
              </h2>
              <p className="mt-2 text-[13px] font-bold leading-5 text-slate-500">
                この日の振り返りを完了すると、今日のTodo画面に進めます。
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setForcedReviewDateKey(incompletePastReviewDateKey);
                setReviewDateKey(incompletePastReviewDateKey);
                setScreen("review");
              }}
              className="h-14 w-full rounded-2xl bg-emerald-500 text-[15px] font-black text-white shadow-[0_12px_22px_rgba(16,185,129,0.26)] active:scale-[0.99]"
            >
              振り返りへ移動する
            </button>
          </div>
        </div>
      )}
    </>
  );
}
