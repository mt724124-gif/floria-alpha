import { createEmptyAppData, STORAGE_KEYS, STORAGE_KEY, LEGACY_LONG_TASKS_KEY } from "../src/utils/storage";

export const makeData = () => ({
  ...createEmptyAppData(),
  tasks: [{ id: 1, title: "英単語", targetDate: "2099-10-08", completed: false, taskStatus: "pending", estimatedMinutes: 30 }],
  longTasks: [{ id: "long-1", title: "卒論", start: "2099-10-08", end: "2099-10-09", dailyPlans: [{ date: "2099-10-08", tasks: [{ id: "sub-1", title: "結果", actualMinutes: 40, carriedFromDate: "2099-10-07", originalLongDailyTaskId: "original", usedTimer: true }] }] }],
  dailyRecords: { "2099-10-08": { date: "2099-10-08", tasks: [{ id: 1, title: "英単語" }], reflectionText: "学習できた", categoryMinutes: { 学習: 30 }, priorityCounts: { high: 1 } } },
  workLogs: [{ id: "log-1", taskId: 1, date: "2099-10-08", minutes: 30 }],
  timerSessions: [{ id: "session-1", taskId: 1, date: "2099-10-08", actualSeconds: 1800 }],
  settings: { custom: "既存項目を維持" },
  customFutureField: { nested: [1, "日本語"] },
});

export function makeValues(data = makeData()) {
  const values = Object.fromEntries(STORAGE_KEYS.map((key) => [key, null]));
  values[STORAGE_KEY] = JSON.stringify(data);
  values[LEGACY_LONG_TASKS_KEY] = JSON.stringify([{ id: "old", title: "旧タスク", dailyPlans: [{ date: "2099-10-08", title: "単一の旧小タスク", estimatedMinutes: "" }] }]);
  values["todo-app-long-task-categories-v1"] = JSON.stringify([{ name: "研究", color: "bg-green-500" }]);
  values["todo-app-ai-destinations-v1"] = JSON.stringify([{ id: "custom", name: "AI", url: "https://chatgpt.com/" }]);
  values["todo-app-selected-ai-destination-id-v1"] = "custom";
  values["todo-app-ai-request-history-v1"] = JSON.stringify([{ id: "request", title: "履歴", tasks: [{ title: "卒論", startDate: "2099-10-08", endDate: "2099-10-09" }], fixedRequests: [{ id: "rule", text: "平日に進める" }] }]);
  values["todo-app-ai-fixed-instructions-v1"] = JSON.stringify([{ id: "rule", text: "平日に進める", enabled: true }]);
  values["last-category"] = "研究";
  values["last-has-planned-time"] = "true";
  return values;
}

export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial).filter(([, value]) => value !== null));
  return {
    writes: [],
    getItem(key) { return map.get(key) ?? null; },
    setItem(key, value) { this.writes.push([key, value]); map.set(key, String(value)); },
    removeItem(key) { this.writes.push([key, null]); map.delete(key); },
  };
}
