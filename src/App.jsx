import { useState } from "react";
import TodayPage from "./TodayPage";
import TimerPage from "./TimerPage";

export default function App() {
  const [screen, setScreen] = useState("today");
  const [timerTask, setTimerTask] = useState(null);
  const [timerCompletion, setTimerCompletion] = useState(null);
  const [taskUpdateRequest, setTaskUpdateRequest] = useState(null);

  const openTimer = (task) => {
    setTimerTask(task);
    setScreen("timer");
  };

  const closeTimer = () => {
    setScreen("today");
  };

  const completeTimer = (result) => {
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
        />
      </div>

      {screen === "timer" && (
        <TimerPage
          task={timerTask}
          onClose={closeTimer}
          onComplete={completeTimer}
          onSaveProgress={completeTimer}
          onUpdateTask={updateTaskFromTimer}
        />
      )}
    </>
  );
}