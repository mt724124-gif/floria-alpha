import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LongTaskDetail from "../src/components/LongTaskDetail";
import TodoModal from "../src/components/TodoModal";
import LongTaskModal from "../src/components/LongTaskModal";
import { updateDailyRecordTask, confirmDailyRecord } from "../src/utils/dailyRecords";
import { createBackup, createEmptyAppData, loadStorage, restoreBackup, saveAppData, STORAGE_KEY } from "../src/utils/storage";
import { memoryStorage } from "./fixtures";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
let container;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("requestAnimationFrame", (callback) => { callback(); return 0; });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const today = () => new Date().toLocaleDateString("sv-SE");
const click = async (target) => { expect(target).toBeTruthy(); await act(async () => target.click()); };
const input = async (target, value) => {
  expect(target).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(target, value);
    target.dispatchEvent(new Event("input", { bubbles: true }));
  });
};
const roundTrip = (data) => {
  // This is exactly what Phase 0's predecessor saved: JSON.stringify(appData).
  const raw = JSON.stringify(data);
  const legacy = memoryStorage({ [STORAGE_KEY]: raw });
  expect(loadStorage(legacy).error).toBeNull();
  expect(legacy.writes).toEqual([]);
  const storage = memoryStorage();
  saveAppData(storage, data);
  expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  const backup = createBackup(storage, data);
  const restored = restoreBackup(memoryStorage(), backup);
  expect(restored).toEqual(JSON.parse(raw));
};

it("実TodoModalの新規保存結果と日別記録の確定結果を読み込み・保存・復元できる", async () => {
  const onSave = vi.fn();
  await act(async () => root.render(<TodoModal open categories={["学習", "その他"]} defaultDateKey={today()} onClose={() => {}} onSave={onSave} />));
  await input(container.querySelector("input"), "実際のTodo入力");
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(onSave).toHaveBeenCalledOnce();
  const task = { ...onSave.mock.calls[0][0], id: 100, rank: 1 };
  const dailyRecords = confirmDailyRecord(updateDailyRecordTask({}, today(), task, { completed: true, taskStatus: "completed", actualMinutes: 15 }), today(), { reflectionText: "実際の振り返り" });
  roundTrip({ ...createEmptyAppData(), tasks: [task], dailyRecords });
});

it("実LongTaskModalで作成した長期タスクを読み込み・保存・復元できる", async () => {
  const onSave = vi.fn();
  await act(async () => root.render(<LongTaskModal open categories={[{ name: "研究", color: "bg-green-500" }]} setCategories={() => {}} onClose={() => {}} onSave={onSave} />));
  await input(container.querySelector('input[type="text"]'), "実際の長期入力");
  await click([...container.querySelectorAll("button")].find((b) => /追加する|保存する|保存|追加/.test(b.textContent) && !b.textContent.includes("カテゴリ")));
  expect(onSave).toHaveBeenCalledOnce();
  roundTrip({ ...createEmptyAppData(), longTasks: [onSave.mock.calls[0][0]] });
});

it.each(["0.5", "-0.5", "未設定"])("実LongTaskDetailの時間入力 %s を従来のJSON保存形式で扱える", async (value) => {
  const task = { id: "long", title: "長期タスク", start: today(), end: today(), dailyPlans: [{ date: today(), tasks: [{ id: "sub", title: "小タスク", estimatedMinutes: 30 }] }] };
  const onUpdateDailyPlan = vi.fn();
  await act(async () => root.render(<LongTaskDetail task={task} onClose={() => {}} onUpdateDailyPlan={onUpdateDailyPlan} />));
  const row = container.querySelector("[data-date]");
  if (!row.querySelector("svg.lucide-square-pen, svg.lucide-pen-line, svg.lucide-edit-3")) await click(row.querySelector("button"));
  const edit = row.querySelector("svg.lucide-square-pen, svg.lucide-pen-line, svg.lucide-edit-3")?.closest("button");
  await click(edit);
  const minutes = [...container.querySelectorAll("input")].find((el) => el.getAttribute("inputmode") === "numeric");
  await input(minutes, value);
  await click([...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "保存"));
  expect(onUpdateDailyPlan).toHaveBeenCalledOnce();
  const plans = onUpdateDailyPlan.mock.calls[0][2];
  const generated = plans[0].tasks[0].estimatedMinutes;
  if (value === "未設定") expect(Number.isNaN(generated)).toBe(true);
  else expect(generated).toBe(Number(value) * 60);
  roundTrip({ ...createEmptyAppData(), longTasks: [{ ...task, dailyPlans: plans }] });
});
