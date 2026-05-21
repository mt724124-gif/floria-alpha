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
      dailyPlans: (task.dailyPlans ?? []).map((plan) => ({
        ...plan,
        id: plan.id ?? createId(),
        selected: plan.selected ?? true,
        date: plan.date ?? "",
        title: plan.title ?? "",
        completed: plan.completed ?? false,
        actualMinutes: plan.actualMinutes ?? null,
        memo: plan.memo ?? "",
        estimatedMinutes:
          plan.estimatedMinutes === "" || plan.estimatedMinutes == null
            ? ""
            : Number(plan.estimatedMinutes),
        status: plan.status ?? "pending",
      })),
    };
  });
}

export default function App() {
  const [screen, setScreen] = useState("today");
  const [timerTask, setTimerTask] = useState(null);
  const [taskUpdateRequest, setTaskUpdateRequest] = useState(null);
  const [reviewDateKey, setReviewDateKey] = useState(getTodayKey());
  const [todayInitialDateKey, setTodayInitialDateKey] = useState(null);

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
    const sessionDate = getTaskDateKey(result?.task);

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
      result?.plannedMinutes ?? result?.task?.estimatedMinutes ?? 0
    );

    const session = {
      id: createId(),
      taskId: result?.task?.id,
      taskTitle: result?.task?.title,
      category: result?.task?.category,
      date: sessionDate,
      actualMinutes,
      actualSeconds,
      plannedMinutes,
      completed: result?.completed ?? false,
      startedAt: result?.startedAt ?? null,
      endedAt: result?.endedAt ?? Date.now(),
      createdAt: new Date().toISOString(),
    };

    updateAppData((current) => {
      const nextTimerSessions = [...(current.timerSessions ?? []), session];

      const timerSessionCount = nextTimerSessions.filter(
        (item) => item.taskId === result?.task?.id && item.date === sessionDate
      ).length;

      const completed = result?.completed === true;

      const nextTasks = (current.tasks ?? []).map((task) => {
        if (task.id !== result?.task?.id) return task;

        return {
          ...task,
          actualMinutes,
          actualSeconds,
          workedMinutes: actualMinutes,
          focusMinutes: actualMinutes,
          elapsedMinutes: actualMinutes,
          elapsedSeconds: actualSeconds,
          completed: completed ? true : task.completed,
          taskStatus: completed ? "completed" : task.taskStatus ?? "pending",
          completedAt: completed ? new Date().toISOString() : task.completedAt ?? null,
          usedTimer: true,
          timerSessionCount,
        };
      });

      const updatedTask =
        nextTasks.find((task) => task.id === result?.task?.id) ?? result?.task;

      const nextDailyRecords = updateDailyRecordTask(
        current.dailyRecords ?? {},
        sessionDate,
        updatedTask,
        {
          actualMinutes,
          actualSeconds,
          completed,
          taskStatus: completed ? "completed" : "pending",
          completedAt: completed ? new Date().toISOString() : null,
          usedTimer: true,
          timerSessionCount,
        }
      );

      const nextWorkLogs = [
        ...(current.workLogs ?? []).filter((log) => log.taskId !== result?.task?.id),
        {
          id: Date.now(),
          taskId: result?.task?.id,
          taskTitle: result?.task?.title,
          category: result?.task?.category,
          minutes: actualMinutes,
          seconds: actualSeconds,
          date: sessionDate,
        },
      ];

      return {
        ...current,
        tasks: nextTasks,
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
      current?.id === normalizedResult.task?.id
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

    updateAppData((current) => ({
      ...current,
      tasks: (current.tasks ?? []).map((task) =>
        task.id === updatedTask?.id ? { ...task, ...updatedTask } : task
      ),
    }));
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
    </>
  );
}