import { describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEY, LEGACY_LONG_TASKS_KEY, STORAGE_KEYS, backupFileName,
  captureStorage, createBackup, createEmptyAppData, createRecoveryBackup,
  downloadJson, loadStorage, parseBackup, restoreBackup, saveAppData, summarizeBackup,
} from "../src/utils/storage";
import { makeData, makeValues, memoryStorage } from "./fixtures";

describe("保存データの保護と互換性", () => {
  it("正常な保存データを変更せず読み込む", () => {
    const values = makeValues();
    const storage = memoryStorage(values);
    const loaded = loadStorage(storage);
    expect(loaded.error).toBeNull();
    expect(loaded.data).toEqual(makeData());
    expect(storage.writes).toEqual([]);
    expect(captureStorage(storage).values).toEqual(values);
  });

  it("保存が存在しない場合のみ初期データを作り、読み込みでは書き込まない", () => {
    const storage = memoryStorage();
    expect(loadStorage(storage).data).toEqual(createEmptyAppData());
    expect(storage.writes).toEqual([]);
  });

  it.each(["{broken", "", "null", "[]", '{"tasks":{}}', '{"tasks":null}', '{}'])("不正な本体 %s を保持し、空データを返さない", (raw) => {
    const storage = memoryStorage({ [STORAGE_KEY]: raw });
    const loaded = loadStorage(storage);
    expect(loaded.error).toBeTruthy();
    expect(loaded.data).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    expect(storage.writes).toEqual([]);
    const recovery = createRecoveryBackup(loaded.snapshot);
    expect(JSON.parse(JSON.stringify(recovery)).storage[STORAGE_KEY]).toBe(raw);
    expect(() => parseBackup(JSON.stringify(recovery))).toThrow();
  });

  it.each([
    { tasks: [], longTasks: {} }, { tasks: [], dailyRecords: [] },
    { tasks: [], workLogs: [null] }, { tasks: [], timerSessions: {} },
    { tasks: [], categories: [{}] }, { tasks: [], settings: [] },
    { tasks: [], longTasks: [{ dailyPlans: [{ date: "2099-02-30", tasks: [] }] }] },
    { tasks: [], dailyRecords: { "2099-10-08": { tasks: {} } } },
  ])("構造不正を保持する：%j", (data) => {
    const raw = JSON.stringify(data);
    const storage = memoryStorage({ [STORAGE_KEY]: raw });
    expect(loadStorage(storage).data).toBeNull();
    expect(storage.writes).toEqual([]);
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });

  it.each(STORAGE_KEYS.filter((key) => key !== STORAGE_KEY && key !== "last-category" && key !== "todo-app-selected-ai-destination-id-v1"))("関連キー %s の破損も初期値で上書きしない", (key) => {
    const storage = memoryStorage({ ...makeValues(), [key]: "{broken" });
    expect(loadStorage(storage).error).toBeTruthy();
    expect(storage.writes).toEqual([]);
    expect(storage.getItem(key)).toBe("{broken");
  });

  it("保存領域を読めない場合も操作用の初期データを返さない", () => {
    const storage = { getItem() { throw new Error("denied"); } };
    const loaded = loadStorage(storage);
    expect(loaded.data).toBeNull();
    expect(loaded.snapshot.unreadableKeys).toEqual(STORAGE_KEYS);
  });

  it("旧本体の省略された追加フィールドをメモリ内で補い、旧形式を保存から消さない", () => {
    const old = { tasks: [{ id: 1, title: "旧Todo" }], categories: ["学習"], workLogs: [], custom: true };
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(old), [LEGACY_LONG_TASKS_KEY]: makeValues()[LEGACY_LONG_TASKS_KEY] });
    const loaded = loadStorage(storage);
    expect(loaded.data.tasks).toEqual(old.tasks);
    expect(loaded.data.longTasks[0].dailyPlans[0].title).toBe("単一の旧小タスク");
    expect(loaded.data.custom).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(old));
    expect(storage.writes).toEqual([]);
  });

  it("旧キーだけのデータを安全に読む", () => {
    const storage = memoryStorage({ [LEGACY_LONG_TASKS_KEY]: makeValues()[LEGACY_LONG_TASKS_KEY] });
    expect(loadStorage(storage).data.longTasks).toHaveLength(1);
    expect(storage.writes).toEqual([]);
  });

  it("本体の明示的な空longTasksを優先し、旧キーから復活させない", () => {
    const storage = memoryStorage(makeValues({ ...makeData(), longTasks: [] }));
    expect(loadStorage(storage).data.longTasks).toEqual([]);
  });

  it("既存の本体キー・JSON形式で通常保存し、付加フィールドを保持する", () => {
    const storage = memoryStorage(makeValues());
    const data = loadStorage(storage).data;
    data.tasks.push({ id: 2, title: "新Todo" });
    saveAppData(storage, data);
    expect(JSON.parse(storage.getItem(STORAGE_KEY))).toEqual(data);
    expect(loadStorage(storage).data.tasks).toHaveLength(2);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)).format).toBeUndefined();
  });
});

describe("バックアップと明示的な置換復元", () => {
  it("全9キー・version・exportedAtを含むバックアップを非破壊で作成", () => {
    const values = makeValues();
    values[STORAGE_KEY] = JSON.stringify(makeData(), null, 2);
    const storage = memoryStorage(values);
    const backup = createBackup(storage, makeData(), new Date("2026-10-08T04:00:00Z"));
    expect(backup.version).toBe(1);
    expect(backup.exportedAt).toBe("2026-10-08T04:00:00.000Z");
    expect(backup.storage).toEqual(values);
    expect(storage.writes).toEqual([]);
    expect(summarizeBackup(backup)).toEqual({ tasks: 1, longTasks: 1, dailyRecords: 1, workLogs: 1, timerSessions: 1, keys: 9 });
    expect(backupFileName("backup", new Date(backup.exportedAt))).toBe("Floria-backup-2026-10-08T04-00-00-000Z.json");
  });

  it("未保存の新規インストールも初期データをバックアップできる", () => {
    const storage = memoryStorage();
    const backup = createBackup(storage, loadStorage(storage).data);
    expect(parseBackup(JSON.stringify(backup)).storage[STORAGE_KEY]).not.toBeNull();
    expect(storage.writes).toEqual([]);
  });

  it("復元は全キーを置換し、バックアップにない設定を残さず無関係なキーを守る", () => {
    const target = memoryStorage({ ...makeValues(), unrelated: "他のアプリ" });
    const source = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ tasks: [{ id: 99, title: "復元Todo" }] }) });
    const backup = parseBackup(JSON.stringify(createBackup(source)));
    const restored = restoreBackup(target, backup);
    expect(restored.tasks[0].id).toBe(99);
    expect(target.getItem("last-category")).toBeNull();
    expect(target.getItem(LEGACY_LONG_TASKS_KEY)).toBeNull();
    expect(captureStorage(target).values).toEqual(backup.storage);
    expect(target.getItem("unrelated")).toBe("他のアプリ");
  });

  it("旧appData JSONをプレビューして復元できる（関連キーは混合しない）", () => {
    const backup = parseBackup(JSON.stringify({ tasks: [{ id: 3, title: "旧形式" }] }));
    expect(backup.legacy).toBe(true);
    const storage = memoryStorage(makeValues());
    expect(restoreBackup(storage, backup).tasks[0].title).toBe("旧形式");
    expect(storage.getItem("last-category")).toBeNull();
  });

  it.each([
    "not-json", "null", "[]", '{}', '{"tasks":"bad"}',
    '{"format":"floria-backup","version":2}',
    '{"format":"floria-backup","version":1,"exportedAt":"bad","storage":{}}',
  ])("不正なバックアップを拒否する：%s", (text) => {
    expect(() => parseBackup(text)).toThrow();
  });

  it("欠けたキー・未知キー・不正なraw値・不正な補助データを拒否", () => {
    for (const mutate of [
      (b) => delete b.storage["last-category"],
      (b) => { b.storage.unrelated = "混入"; },
      (b) => { b.storage[STORAGE_KEY] = {}; },
      (b) => { b.storage["todo-app-ai-request-history-v1"] = '[{"tasks":{}}]'; },
    ]) {
      const backup = createBackup(memoryStorage(makeValues()));
      mutate(backup);
      const storage = memoryStorage(makeValues());
      expect(() => restoreBackup(storage, backup)).toThrow();
      expect(storage.writes).toEqual([]);
    }
  });

  it.each(["setItem", "removeItem"])("復元途中の%s失敗時に元の全raw値へ戻す", (method) => {
    const before = makeValues();
    const storage = memoryStorage(before);
    const source = memoryStorage(method === "setItem" ? makeValues({ ...makeData(), tasks: [] }) : { [STORAGE_KEY]: JSON.stringify({ tasks: [] }) });
    if (method === "setItem") source.setItem("todo-app-long-task-categories-v1", '[{"name":"変更"}]');
    const backup = createBackup(source);
    const original = storage[method].bind(storage);
    let count = 0;
    vi.spyOn(storage, method).mockImplementation((key, value) => {
      count += 1;
      if (count === 2) throw new Error("quota");
      original(key, value);
    });
    try { restoreBackup(storage, backup); throw new Error("should fail"); }
    catch (error) {
      expect(error.rollbackSucceeded).toBe(true);
      expect(error.snapshot.values).toEqual(before);
    }
    expect(captureStorage(storage).values).toEqual(before);
  });

  it("ロールバックも失敗した場合に復元前スナップショットを提供する", () => {
    const before = makeValues();
    const storage = memoryStorage(before);
    const backup = createBackup(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ tasks: [] }) }));
    const remove = storage.removeItem.bind(storage);
    let removals = 0;
    vi.spyOn(storage, "removeItem").mockImplementation((key) => {
      if (++removals === 2) throw new Error("remove failed");
      remove(key);
    });
    vi.spyOn(storage, "setItem").mockImplementation(() => { throw new Error("rollback failed"); });
    expect(() => restoreBackup(storage, backup)).toThrow(expect.objectContaining({ rollbackSucceeded: false, snapshot: { values: before, unreadableKeys: [] } }));
  });

  it("書き込み後に例外が発生したキーもロールバックする", () => {
    const before = makeValues();
    const storage = memoryStorage(before);
    const backup = createBackup(memoryStorage(makeValues({ ...makeData(), tasks: [] })));
    const write = storage.setItem.bind(storage);
    let once = true;
    vi.spyOn(storage, "setItem").mockImplementation((key, value) => {
      write(key, value);
      if (once) { once = false; throw new Error("after write"); }
    });
    expect(() => restoreBackup(storage, backup)).toThrow(expect.objectContaining({ rollbackSucceeded: true }));
    expect(captureStorage(storage).values).toEqual(before);
  });

  it("読み出せない現在データを復元で上書きしない", () => {
    const storage = memoryStorage(makeValues());
    const backup = createBackup(storage);
    vi.spyOn(storage, "getItem").mockImplementation(() => { throw new Error("denied"); });
    expect(() => restoreBackup(storage, backup)).toThrow("現在のデータを退避できない");
    expect(storage.writes).toEqual([]);
  });

  it("バックアップ後も未知フィールド・延期関連・タイマー情報と旧日別形式を保持する", () => {
    const values = makeValues();
    const source = memoryStorage(values);
    const backup = createBackup(source, loadStorage(source).data);
    const target = memoryStorage();
    restoreBackup(target, backup);
    expect(captureStorage(target).values).toEqual(values);
    expect(loadStorage(target).data).toEqual(makeData());
    expect(source.writes).toEqual([]);
  });
});

describe("JSONファイルのダウンロード", () => {
  it("UTF-8 JSONと日時付きファイル名を作り、リンクとURLを解放", async () => {
    vi.useFakeTimers();
    const create = vi.fn(() => "blob:test");
    const revoke = vi.fn();
    const oldCreate = URL.createObjectURL;
    const oldRevoke = URL.revokeObjectURL;
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      expect(this.download).toMatch(/^Floria-backup-.*\.json$/);
    });
    try {
      downloadJson({ text: "日本語の振り返り" });
      expect(click).toHaveBeenCalledOnce();
      expect(document.querySelector('a[href="blob:test"]')).toBeNull();
      const blob = create.mock.calls[0][0];
      expect(blob.type).toBe("application/json;charset=utf-8");
      vi.runAllTimers();
      expect(revoke).toHaveBeenCalledWith("blob:test");
      vi.useRealTimers();
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(blob);
      });
      expect(JSON.parse(text)).toEqual({ text: "日本語の振り返り" });
    } finally {
      vi.useRealTimers();
      URL.createObjectURL = oldCreate;
      URL.revokeObjectURL = oldRevoke;
      click.mockRestore();
    }
  });
});
