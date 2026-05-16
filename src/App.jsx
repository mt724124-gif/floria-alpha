import { useEffect, useState } from "react";
import TodayPage from "./TodayPage";
import TimerPage from "./TimerPage";
import CalendarPage from "./CalendarPage";
import StatsPageDay from "./StatsPage_day";
import SetPage from "./SetPage";
import { updateDailyRecordTask } from "./utils/dailyRecords";
import ReviewPage from "./ReviewPage";

const STORAGE_KEY = "todo-app-data-v1";

function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

function getTaskDateKey(task) {
  return task?.targetDate ?? task?.date ?? task?.createdDate ?? getTodayKey();
}

function isSameDateKey(a, b) {
  return String(a) === String(b);
}

function isFutureDateKey(dateKey) {
  return String(dateKey) > getTodayKey();
}

function isTaskCompleted(task) {
  return task?.completed === true || task?.taskStatus === "completed" || task?.status === "completed";
}

function isTaskActive(task) {
  return task?.deleted !== true && task?.status !== "deleted" && task?.taskStatus !== "deleted";
}

function normalizeReviewCompletion(data) {
  const todayKey = getTodayKey();
  const dailyRecords = data?.dailyRecords ?? {};
  const tasks = data?.tasks ?? [];
  const nextDailyRecords = { ...dailyRecords };

  Object.keys(nextDailyRecords).forEach((dateKey) => {
    const record = nextDailyRecords[dateKey];
    if (!record?.reviewCompleted) return;

    const recordTasks = Array.isArray(record.tasks) ? record.tasks : [];
    const pageTasks = tasks.filter((task) => isSameDateKey(getTaskDateKey(task), dateKey));
    const allTasks = [...recordTasks, ...pageTasks];

    const hasIncompleteTask = allTasks.some((task) => isTaskActive(task) && !isTaskCompleted(task));

    if (hasIncompleteTask) {
      nextDailyRecords[dateKey] = {
        ...record,
        reviewCompleted: false,
        reviewCompletedAt: null,
      };
    }
  });

  return {
    ...data,
    dailyRecords: nextDailyRecords,
    todayKey,
  };
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

export default function App() {
  const [screen, setScreen] = useState("today");
  const [timerTask, setTimerTask] = useState(null);
  const [timerCompletion, setTimerCompletion] = useState(null);
  const [taskUpdateRequest, setTaskUpdateRequest] = useState(null);
  const [reviewDateKey, setReviewDateKey] = useState(getTodayKey());

  const [appData, setAppData] = useState(() => {
    return normalizeReviewCompletion({
      tasks: [],
      categories: ["学習", "仕事", "健康", "その他"],
      workLogs: [],
      timerSessions: [],
      dailyRecords: {},
      settings: {},
      ...(loadSavedData() ?? {}),
    });
  });

  useEffect(() => {
    saveData(appData);
  }, [appData]);

  const updateAppData = (updater) => {
    setAppData((current) => {
      const nextData = typeof updater === "function" ? updater(current) : updater;
      return normalizeReviewCompletion(nextData);
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
    setScreen("today");
  };

  const handleTimerResult = (result) => {
    const sessionDate = getTaskDateKey(result?.task);

    const actualMinutes = Math.max(0, Number(result?.actualMinutes ?? 0));
    const actualSeconds = Math.max(0, Number(result?.actualSeconds ?? actualMinutes * 60));
    const plannedMinutes = Number(result?.plannedMinutes ?? result?.task?.estimatedMinutes ?? 0);

    const session = {
      id: crypto.randomUUID(),
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

      const nextTasks = (current.tasks ?? []).map((task) => {
        if (task.id !== result?.task?.id) return task;

        return {
          ...task,
          actualMinutes,
          actualSeconds,
          workedMinutes: actualMinutes,
          focusMinutes: actualMinutes,
          completed: result?.completed ? true : task.completed,
          taskStatus: result?.completed ? "completed" : task.taskStatus ?? "pending",
          completedAt: result?.completed ? new Date().toISOString() : task.completedAt ?? null,
          usedTimer: true,
          timerSessionCount,
        };
      });

      const nextDailyRecords = updateDailyRecordTask(
        current.dailyRecords ?? {},
        sessionDate,
        result?.task,
        {
          actualMinutes,
          actualSeconds,
          completed: result?.completed ?? false,
          taskStatus: result?.completed ? "completed" : "pending",
          completedAt: result?.completed ? new Date().toISOString() : null,
          usedTimer: true,
          timerSessionCount,
        }
      );

      return {
        ...current,
        tasks: nextTasks,
        timerSessions: nextTimerSessions,
        dailyRecords: nextDailyRecords,
      };
    });

    setTimerCompletion({
      ...result,
      actualMinutes,
      actualSeconds,
      plannedMinutes,
    });
    setScreen("today");
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

  return (
    <>
      {screen === "today" && (
        <TodayPage
          onOpenTimer={openTimer}
          timerCompletion={timerCompletion}
          onTimerCompletionHandled={() => setTimerCompletion(null)}
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

      {screen === "review" && (
        <ReviewPage
          dateKey={reviewDateKey}
          appData={appData}
          setAppData={updateAppData}
          onNavigate={setScreen}
        />
      )}

      {screen === "settings" && <SetPage onNavigate={setScreen} />}

      {screen === "timer" && (
        <TimerPage
          task={timerTask}
          onClose={closeTimer}
          onComplete={handleTimerResult}
          onSaveProgress={handleTimerResult}
          onUpdateTask={updateTaskFromTimer}
        />
      )}
    </>
  );
}