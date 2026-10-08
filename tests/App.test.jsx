import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { createBackup, STORAGE_KEY, STORAGE_KEYS, captureStorage } from "../src/utils/storage";
import * as storageModule from "../src/utils/storage";
import { makeData, makeValues, memoryStorage } from "./fixtures";

vi.mock("../src/TodayPage", () => ({
  default: ({ appData, setAppData, onNavigate }) => (
    <div data-testid="today">
      <span>{appData.tasks.map((task) => task.title).join("・")}</span>
      <button onClick={() => onNavigate("settings")}>設定へ</button>
      <button onClick={() => setAppData((data) => ({ ...data, tasks: [...data.tasks, { id: 999, title: "追加したタスク" }] }))}>テスト用タスク追加</button>
    </div>
  ),
}));

let root;
let container;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

const seed = (values) => {
  for (const [key, value] of Object.entries(values)) if (value !== null) localStorage.setItem(key, value);
};
const mount = async () => act(async () => root.render(<React.StrictMode><App /></React.StrictMode>));
const button = (text) => [...container.querySelectorAll("button")].find((node) => node.textContent.trim() === text);
const click = async (text) => act(async () => { const target = button(text); expect(target).toBeTruthy(); target.click(); });
const choose = async (text) => {
  const input = container.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", { configurable: true, value: [{ name: "test.json", text: async () => text }] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
};

describe("Appとデータ管理の接続", () => {
  it("破損時に通常画面をマウントせず、StrictModeでも書き込まない", async () => {
    seed({ [STORAGE_KEY]: "{broken", "last-category": "保存中の値" });
    const writes = vi.spyOn(Storage.prototype, "setItem");
    await mount();
    expect(container.textContent).toContain("保存データを保護しています");
    expect(container.querySelector('[data-testid="today"]')).toBeNull();
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("{broken");
  });

  it("必須フィールド不正時も通常画面と保存を停止", async () => {
    seed({ [STORAGE_KEY]: '{"tasks":{}}' });
    const writes = vi.spyOn(Storage.prototype, "setItem");
    await mount();
    expect(container.textContent).toContain("appData.tasks");
    expect(container.querySelector('[data-testid="today"]')).toBeNull();
    expect(writes).not.toHaveBeenCalled();
  });

  it("正常データを初回に再保存せず、通常操作時は同じ形式で保存", async () => {
    seed(makeValues());
    const raw = localStorage.getItem(STORAGE_KEY);
    const writes = vi.spyOn(Storage.prototype, "setItem");
    await mount();
    expect(container.textContent).toContain("英単語");
    expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    await click("テスト用タスク追加");
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.tasks).toHaveLength(2);
    expect(saved.customFutureField).toEqual(makeData().customFutureField);
  });

  it("未保存時に通常画面を使え、操作前に保存キーを作らない", async () => {
    await mount();
    expect(container.querySelector('[data-testid="today"]')).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    await click("テスト用タスク追加");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).tasks[0].title).toBe("追加したタスク");
  });

  it("関連キー破損でも通常画面を開かない", async () => {
    seed({ ...makeValues(), "todo-app-ai-destinations-v1": "null" });
    await mount();
    expect(container.querySelector('[data-testid="today"]')).toBeNull();
    expect(localStorage.getItem("todo-app-ai-destinations-v1")).toBe("null");
  });

  it("保存領域へのアクセスを拒否された場合に保護画面を表示", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    const writes = vi.spyOn(Storage.prototype, "setItem");
    await mount();
    expect(container.textContent).toContain("保存領域にアクセスできません");
    expect(container.querySelector('[data-testid="today"]')).toBeNull();
    expect(writes).not.toHaveBeenCalled();
  });

  it("保存失敗時に通常操作を停止し、未保存stateも退避対象に残す", async () => {
    seed(makeValues());
    await mount();
    const original = localStorage.getItem(STORAGE_KEY);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("容量不足"); });
    await click("テスト用タスク追加");
    expect(container.querySelector('[data-testid="today"]')).toBeNull();
    expect(container.textContent).toContain("保存に失敗しました");
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
    const download = vi.spyOn(storageModule, "downloadJson").mockImplementation(() => {});
    await click("元データをJSONで退避");
    const exported = download.mock.calls[0][0];
    expect(exported.storage[STORAGE_KEY]).toBe(original);
    expect(exported.unsavedAppData.tasks).toHaveLength(2);
  });

  it("復元とロールバックの失敗時は通常画面を閉じ、元データを退避できる", async () => {
    seed(makeValues());
    await mount();
    await click("設定へ");
    const before = captureStorage(localStorage).values;
    const backup = createBackup(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ tasks: [] }) }));
    await choose(JSON.stringify(backup));
    await act(async () => container.querySelector('input[type="checkbox"]').click());
    const remove = Storage.prototype.removeItem;
    let removals = 0;
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (key) {
      if (++removals === 2) throw new Error("remove failed");
      remove.call(this, key);
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("rollback failed"); });
    const download = vi.spyOn(storageModule, "downloadJson").mockImplementation(() => {});
    await click("確認した内容で復元する");
    expect(container.textContent).toContain("保存データを保護しています");
    expect(container.querySelector('[data-testid="today"]')).toBeNull();
    await click("元データをJSONで退避");
    expect(download.mock.calls[0][0].storage).toEqual(before);
  });

  it("設定でのバックアップ操作は既存保存データを変更しない", async () => {
    seed(makeValues());
    await mount();
    await click("設定へ");
    const before = captureStorage(localStorage).values;
    const download = vi.spyOn(storageModule, "downloadJson").mockImplementation(() => {});
    await click("バックアップを作成");
    expect(download.mock.calls[0][0].storage).toEqual(before);
    expect(captureStorage(localStorage).values).toEqual(before);
  });

  it("プレビュー・最終確認前には復元せず、成功後にstateと全キーを一致させる", async () => {
    seed(makeValues());
    await mount();
    await click("設定へ");
    expect(container.textContent).toContain("データ管理");
    const source = memoryStorage(makeValues({ ...makeData(), tasks: [{ id: 42, title: "復元されたタスク", targetDate: "2099-10-08" }] }));
    source.removeItem("last-category");
    const backup = createBackup(source);
    const before = captureStorage(localStorage).values;
    await choose(JSON.stringify(backup));
    expect(container.textContent).toContain("復元内容の確認");
    expect(button("確認した内容で復元する").disabled).toBe(true);
    expect(captureStorage(localStorage).values).toEqual(before);
    await act(async () => container.querySelector('input[type="checkbox"]').click());
    await click("確認した内容で復元する");
    expect(container.querySelector('[data-testid="today"]').textContent).toContain("復元されたタスク");
    expect(container.textContent).toContain("バックアップから復元しました");
    expect(captureStorage(localStorage).values).toEqual(backup.storage);
  });

  it("破損保護画面から正常なバックアップへ復元できる", async () => {
    seed({ [STORAGE_KEY]: "{broken" });
    await mount();
    const backup = createBackup(memoryStorage(makeValues()));
    await choose(JSON.stringify(backup));
    await act(async () => container.querySelector('input[type="checkbox"]').click());
    await click("確認した内容で復元する");
    expect(container.querySelector('[data-testid="today"]')).not.toBeNull();
    expect(captureStorage(localStorage).values).toEqual(backup.storage);
  });

  it("不正ファイル拒否・キャンセル時にデータを変更しない", async () => {
    seed(makeValues());
    await mount();
    await click("設定へ");
    const before = captureStorage(localStorage).values;
    await choose('{"tasks":"invalid"}');
    expect(container.textContent).toContain("復元できないファイルです");
    expect(button("確認した内容で復元する")).toBeUndefined();
    await choose(JSON.stringify(createBackup(memoryStorage(makeValues()))));
    await click("キャンセル");
    expect(container.textContent).not.toContain("復元内容の確認");
    expect(captureStorage(localStorage).values).toEqual(before);
  });

  it("復元後に関連設定の古い値を残さない", async () => {
    seed(makeValues());
    await mount();
    await click("設定へ");
    await choose(JSON.stringify({ tasks: [{ id: 5, title: "旧JSON" }] }));
    expect(container.textContent).toContain("関連設定は置換時に解除されます");
    await act(async () => container.querySelector('input[type="checkbox"]').click());
    await click("確認した内容で復元する");
    expect(container.textContent).toContain("旧JSON");
    for (const key of STORAGE_KEYS.filter((key) => key !== STORAGE_KEY)) expect(localStorage.getItem(key)).toBeNull();
  });
});
