import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { captureStorage, createBackup, STORAGE_KEY } from "../src/utils/storage";
import { makeData, makeValues, memoryStorage } from "./fixtures";

// Real TodayPage and SettingsPage; no page mocks in this file.
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
const todayKey = () => new Date().toLocaleDateString("sv-SE");
const dataForToday = (title) => ({ ...makeData(), tasks: [{ id: 1, title, targetDate: todayKey(), completed: false, taskStatus: "pending", estimatedMinutes: 30 }] });
const seed = (values) => Object.entries(values).forEach(([key, value]) => { if (value !== null) localStorage.setItem(key, value); });

it("実際のTodayと設定画面を表示し、正常データを初回に書き換えない", async () => {
  const values = makeValues(dataForToday("実画面テスト"));
  seed(values);
  const writes = vi.spyOn(Storage.prototype, "setItem");
  await act(async () => root.render(<React.StrictMode><App /></React.StrictMode>));
  await act(async () => [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "全表示").click());
  expect(container.textContent).toContain("実画面テスト");
  expect(writes).not.toHaveBeenCalled();
  await act(async () => [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "設定").click());
  expect(container.textContent).toContain("データ管理");
  expect(localStorage.getItem(STORAGE_KEY)).toBe(values[STORAGE_KEY]);
});

it("復元後に実際のTodayが復元したタスクを表示する", async () => {
  seed(makeValues(dataForToday("復元前のタスク")));
  await act(async () => root.render(<App />));
  await act(async () => [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "設定").click());
  const backup = createBackup(memoryStorage(makeValues(dataForToday("復元後のタスク"))));
  const input = container.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", { value: [{ name: "test.json", text: async () => JSON.stringify(backup) }] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  await act(async () => container.querySelector('input[type="checkbox"]').click());
  await act(async () => [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "確認した内容で復元する").click());
  await act(async () => [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "全表示").click());
  expect(container.textContent).toContain("復元後のタスク");
  expect(container.textContent).not.toContain("復元前のタスク");
  expect(captureStorage(localStorage).values).toEqual(backup.storage);
});
