import { useEffect, useState } from "react";
import TodayPage from "./TodayPage";
import TimerPage from "./TimerPage";

const STORAGE_KEY = "todo-app-data-v1";

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
    return (
      loadSavedData() ?? {
        tasks: [],
        categories: ["学習", "仕事", "健康", "その他"],
        workLogs: [],
        timerSessions: [],
        settings: {},
      }
    );
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
    const session = {
      id: crypto.randomUUID(),
      taskId: result?.task?.id,
      taskTitle: result?.task?.title,
      category: result?.task?.category,
      actualMinutes: result?.actualMinutes ?? 0,
      actualSeconds: result?.actualSeconds ?? 0,
      plannedMinutes: result?.plannedMinutes ?? result?.task?.estimatedMinutes ?? 0,
      completed: result?.completed ?? false,
      startedAt: result?.startedAt ?? null,
      endedAt: result?.endedAt ?? Date.now(),
      createdAt: new Date().toISOString(),
    };

    updateAppData((current) => ({
      ...current,
      timerSessions: [...(current.timerSessions ?? []), session],
    }));

    setTimerCompletion(result);
    setScreen("today");
  };

  const updateTaskFromTimer = (updatedTask) => {
    setTimerTask(updatedTask);
    setTaskUpdateRequest(updatedTask);
  };

  return (
    <>
      <div className={screen === "today" ? "block" : "hidden"}>
        <TodayPage
          onOpenTimer={openTimer}
          timerCompletion={timerCompletion}
          onTimerCompletionHandled={() => setTimerCompletion(null)}
          taskUpdateRequest={taskUpdateRequest}
          onTaskUpdateHandled={() => setTaskUpdateRequest(null)}
          appData={appData}
          setAppData={updateAppData}
        />
      </div>

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