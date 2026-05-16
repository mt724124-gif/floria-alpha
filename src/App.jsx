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

  const [appData, setAppData] = useState(() => {
    return {
      tasks: [],
      categories: ["学習", "仕事", "健康", "その他"],
      workLogs: [],
      timerSessions: [],
      dailyRecords: {},
      settings: {},
      ...(loadSavedData() ?? {}),
    };
  });

  useEffect(() => {
    saveData(appData);
  }, [appData]);

  const updateAppData = (updater) => {
    setAppData((current) => {
      if (typeof updater === "function") {
        return updater(current);
      }

      return updater;
    });
  };

  const openTimer = (task) => {
    setTimerTask(task);
    setScreen("timer");
  };

  const closeTimer = () => {
    setScreen("today");
  };

  const handleTimerResult = (result) => {
    const sessionDate =
      result?.task?.targetDate ??
      result?.task?.date ??
      result?.task?.createdDate ??
      getTodayKey();

    const session = {
      id: crypto.randomUUID(),
      taskId: result?.task?.id,
      taskTitle: result?.task?.title,
      category: result?.task?.category,
      date: sessionDate,
      actualMinutes: result?.actualMinutes ?? 0,
      actualSeconds: result?.actualSeconds ?? 0,
      plannedMinutes:
        result?.plannedMinutes ?? result?.task?.estimatedMinutes ?? 0,
      completed: result?.completed ?? false,
      startedAt: result?.startedAt ?? null,
      endedAt: result?.endedAt ?? Date.now(),
      createdAt: new Date().toISOString(),
    };

    updateAppData((current) => {
      const nextTimerSessions = [...(current.timerSessions ?? []), session];

      const timerSessionCount = nextTimerSessions.filter(
        (item) =>
          item.taskId === result?.task?.id && item.date === sessionDate
      ).length;

      const nextDailyRecords = updateDailyRecordTask(
        current.dailyRecords ?? {},
        sessionDate,
        result?.task,
        {
          actualMinutes: result?.actualMinutes ?? 0,
          completed: result?.completed ?? false,
          taskStatus: result?.completed ? "completed" : "pending",
          completedAt: result?.completed ? new Date().toISOString() : null,
          usedTimer: true,
          timerSessionCount,
        }
      );

      return {
        ...current,
        timerSessions: nextTimerSessions,
        dailyRecords: nextDailyRecords,
      };
    });

    setTimerCompletion(result);
    setScreen("today");
  };

  const updateTaskFromTimer = (updatedTask) => {
    setTimerTask(updatedTask);
    setTaskUpdateRequest(updatedTask);
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