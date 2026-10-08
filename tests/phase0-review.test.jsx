import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import * as storageModule from "../src/utils/storage";
import { makeData, makeValues, memoryStorage } from "./fixtures";

// Export during the commit, before App's passive save effect runs.
vi.mock("../src/TodayPage", () => ({ default: ({ appData, setAppData, onNavigate, onOpenTimer }) => (<>
  <button onClick={() => {
    setAppData((data) => ({ ...data, tasks: [...data.tasks, { id: 42, title: "更新直後のタスク" }] }));
    onNavigate("settings");
  }}>更新して設定へ</button>
  <button onClick={() => onNavigate("ai")}>AIへ</button>
  <button onClick={() => onOpenTimer(appData.tasks[0])}>タイマーへ</button>
</>) }));
vi.mock("../src/TimerPage", () => ({ default: ({ task, onComplete }) => (
  <button onClick={() => onComplete({ task, actualMinutes: 15, actualSeconds: 900, plannedMinutes: 30, completed: true, startedAt: 100, endedAt: 200 })}>計測結果を保存</button>
) }));
vi.mock("../src/SetPage", () => ({ default: function Settings({ onExportBackup }) {
  useLayoutEffect(() => { onExportBackup(); }, [onExportBackup]);
  return <div>設定</div>;
} }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
let container;
beforeEach(() => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

it("保存済み本体が古くても最新stateをバックアップし、保存領域は変更しない", () => {
  const values = makeValues();
  const storage = memoryStorage(values);
  const latest = { ...makeData(), tasks: [{ id: 42, title: "更新直後" }] };
  const backup = storageModule.createBackup(storage, latest);
  expect(JSON.parse(backup.storage[storageModule.STORAGE_KEY])).toEqual(latest);
  expect(storageModule.captureStorage(storage).values).toEqual(values);
  expect(storage.writes).toEqual([]);
  const target = memoryStorage();
  expect(storageModule.restoreBackup(target, backup).tasks).toEqual(latest.tasks);
});

it.each(["編集", "完了", "削除", "長期更新", "振り返り更新"])("保存effect待ちの%s結果もバックアップに含める", (operation) => {
  const values = makeValues();
  const storage = memoryStorage(values);
  const latest = makeData();
  if (operation === "編集") latest.tasks[0].title = "編集直後";
  if (operation === "完了") latest.tasks[0].completed = true;
  if (operation === "削除") latest.tasks = [];
  if (operation === "長期更新") latest.longTasks[0].dailyPlans[0].tasks[0].title = "計画更新直後";
  if (operation === "振り返り更新") latest.dailyRecords["2099-10-08"].reflectionText = "再編集直後";
  const backup = storageModule.createBackup(storage, latest);
  expect(storageModule.restoreBackup(memoryStorage(), backup)).toEqual(latest);
  expect(storageModule.captureStorage(storage).values).toEqual(values);
  for (const key of storageModule.STORAGE_KEYS.filter((key) => key !== storageModule.STORAGE_KEY)) expect(backup.storage[key]).toBe(values[key]);
});

it.each([{ tasks: null }, { tasks: [], longTasks: [{}], dailyRecords: [] }, { tasks: [], longTasks: [{ dailyPlans: [{ date: "2099-10-08", tasks: {} }] }] }])("JSON化後も不正構造を拒否し、既存保存を保護する：%j", (invalid) => {
  const storage = memoryStorage(makeValues());
  const before = storageModule.captureStorage(storage).values;
  expect(() => storageModule.saveAppData(storage, invalid)).toThrow();
  expect(() => storageModule.createBackup(storage, invalid)).toThrow();
  expect(storageModule.captureStorage(storage).values).toEqual(before);
  expect(storage.writes).toEqual([]);
});

it("タスク更新のReact commit直後、保存effect前のバックアップに更新結果を含める", async () => {
  const values = makeValues();
  Object.entries(values).forEach(([key, value]) => { if (value !== null) localStorage.setItem(key, value); });
  const download = vi.spyOn(storageModule, "downloadJson").mockImplementation(() => {});
  let rawAtExport;
  download.mockImplementation(() => { rawAtExport = localStorage.getItem(storageModule.STORAGE_KEY); });
  await act(async () => root.render(<App />));
  await act(async () => container.querySelector("button").click());
  expect(rawAtExport).toBe(values[storageModule.STORAGE_KEY]);
  const backup = download.mock.calls[0][0];
  expect(JSON.parse(backup.storage[storageModule.STORAGE_KEY]).tasks.at(-1).title).toBe("更新直後のタスク");
  expect(JSON.parse(localStorage.getItem(storageModule.STORAGE_KEY)).tasks.at(-1).title).toBe("更新直後のタスク");
});

const seedData = () => Object.entries(makeValues()).forEach(([key, value]) => { if (value !== null) localStorage.setItem(key, value); });
const clickButton = async (text) => {
  const target = [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
  expect(target).toBeTruthy();
  await act(async () => target.click());
};
const assertStoredRoundTrip = () => {
  const loaded = storageModule.loadStorage(localStorage);
  expect(loaded.error).toBeNull();
  const before = storageModule.captureStorage(localStorage).values;
  const backup = storageModule.createBackup(localStorage, loaded.data);
  expect(storageModule.restoreBackup(memoryStorage(), backup)).toEqual(loaded.data);
  expect(storageModule.captureStorage(localStorage).values).toEqual(before);
  return loaded.data;
};

it("実Appの計測結果保存が生成したtasks・workLogs・timerSessions・dailyRecordsを往復できる", async () => {
  seedData();
  const initial = makeData();
  initial.tasks[0].targetDate = new Date().toLocaleDateString("sv-SE");
  localStorage.setItem(storageModule.STORAGE_KEY, JSON.stringify(initial));
  await act(async () => root.render(<App />));
  await clickButton("タイマーへ");
  await clickButton("計測結果を保存");
  const data = assertStoredRoundTrip();
  expect(data.tasks[0].completed).toBe(true);
  expect(data.workLogs.at(-1).minutes).toBe(15);
  expect(data.timerSessions.at(-1).actualSeconds).toBe(900);
  expect(data.dailyRecords[data.tasks[0].targetDate].tasks[0].actualMinutes).toBe(15);
});

it("実AIPageでサンプルJSONを取り込み、実Appで保存した長期計画とAI設定を往復できる", async () => {
  seedData();
  await act(async () => root.render(<App />));
  await clickButton("AIへ");
  const tab = [...container.querySelectorAll("button")].find((b) => b.textContent.includes("提案編集"));
  await act(async () => tab.click());
  await clickButton("例");
  await clickButton("読み込む");
  await clickButton("保存する");
  const data = assertStoredRoundTrip();
  const added = data.longTasks.at(-1);
  expect(added.source).toBe("ai");
  expect(added.dailyPlans.some((plan) => plan.tasks.length > 0)).toBe(true);
  expect(added.aiMetadata.version).toBe("long_task_plan_v1");
});
