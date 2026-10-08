// Keep existing localStorage keys and their raw values unchanged.
export const STORAGE_KEY = "todo-app-data-v1";
export const LEGACY_LONG_TASKS_KEY = "todo-app-long-tasks-v1";
export const STORAGE_KEYS = Object.freeze([
  STORAGE_KEY,
  LEGACY_LONG_TASKS_KEY,
  "todo-app-long-task-categories-v1",
  "todo-app-ai-destinations-v1",
  "todo-app-selected-ai-destination-id-v1",
  "todo-app-ai-request-history-v1",
  "todo-app-ai-fixed-instructions-v1",
  "last-category",
  "last-has-planned-time",
]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const owns = (object, key) => Object.hasOwn(object, key);
const fail = (path) => { throw new Error(`${path} の形式が正しくありません。`); };

function object(value, path) {
  if (!isObject(value)) fail(path);
}

function array(value, path, validateItem = object) {
  if (!Array.isArray(value)) fail(path);
  value.forEach((item, index) => validateItem(item, `${path}[${index}]`));
}

function string(value, path) {
  if (typeof value !== "string") fail(path);
}

function optionalString(value, key, path) {
  if (value[key] != null) string(value[key], `${path}.${key}`);
}

function dateKey(value, path) {
  string(value, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(path);
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail(path);
}

function task(value, path) {
  object(value, path);
  for (const key of ["title", "taskTitle", "category", "memo", "detail", "taskStatus", "type"]) {
    optionalString(value, key, path);
  }
  if (value.id != null && typeof value.id !== "string" &&
      !(typeof value.id === "number" && Number.isFinite(value.id))) fail(`${path}.id`);
  for (const key of ["completed", "selected", "reviewOnly"]) {
    if (value[key] != null && typeof value[key] !== "boolean") fail(`${path}.${key}`);
  }
  for (const key of ["estimatedMinutes", "actualMinutes", "actualSeconds", "workedMinutes", "focusMinutes", "elapsedMinutes", "elapsedSeconds", "minutes", "seconds", "plannedMinutes"]) {
    const number = value[key];
    // Legacy planned time can be an empty string or a numeric string.
    if (number != null && !(typeof number === "number" || typeof number === "string")) fail(`${path}.${key}`);
    // Existing editors can save negative values; Phase 0 validates structure,
    // not new time-entry rules. Preserve those values without correcting them.
    if (number != null && !Number.isFinite(Number(number))) fail(`${path}.${key}`);
  }
  for (const key of ["date", "targetDate", "createdDate", "postponedToDate", "postponedFromDate", "carriedFromDate"]) {
    if (value[key] != null && value[key] !== "") dateKey(value[key], `${path}.${key}`);
  }
}

function longTask(value, path) {
  task(value, path);
  for (const key of ["start", "end", "startDate", "endDate"]) {
    if (value[key] != null && value[key] !== "") dateKey(value[key], `${path}.${key}`);
  }
  if (owns(value, "dailyPlans")) array(value.dailyPlans, `${path}.dailyPlans`, (plan, planPath) => {
    task(plan, planPath);
    dateKey(plan.date, `${planPath}.date`);
    if (owns(plan, "tasks")) array(plan.tasks, `${planPath}.tasks`, task);
    // Old single-task daily plans are intentionally preserved, not migrated.
  });
}

export function validateAppData(data) {
  object(data, "appData");
  array(data.tasks, "appData.tasks", task);
  for (const key of ["longTasks", "aiLongTaskDrafts"]) {
    if (owns(data, key)) array(data[key], `appData.${key}`, longTask);
  }
  for (const key of ["workLogs", "timerSessions"]) {
    if (owns(data, key)) array(data[key], `appData.${key}`, task);
  }
  if (owns(data, "categories")) array(data.categories, "appData.categories", string);
  if (owns(data, "settings")) object(data.settings, "appData.settings");
  if (owns(data, "dailyRecords")) {
    object(data.dailyRecords, "appData.dailyRecords");
    for (const [key, record] of Object.entries(data.dailyRecords)) {
      dateKey(key, "appData.dailyRecordsの日付");
      object(record, `appData.dailyRecords.${key}`);
      if (owns(record, "tasks")) array(record.tasks, `appData.dailyRecords.${key}.tasks`, task);
      for (const field of ["categoryMinutes", "priorityCounts"]) {
        if (owns(record, field)) object(record[field], `appData.dailyRecords.${key}.${field}`);
      }
      optionalString(record, "reflectionText", `appData.dailyRecords.${key}`);
      optionalString(record, "status", `appData.dailyRecords.${key}`);
    }
  }
  return data;
}

export function createEmptyAppData() {
  return {
    tasks: [], categories: ["学習", "仕事", "健康", "その他"],
    workLogs: [], timerSessions: [], dailyRecords: {}, longTasks: [],
    aiLongTaskDrafts: [], settings: {},
  };
}

function parseJson(raw, key) {
  try { return JSON.parse(raw); }
  catch { throw new Error(`${key} のJSONを読み込めません。元データは変更していません。`); }
}

function validateRawValue(key, raw) {
  if (raw === null) return;
  string(raw, key);
  if (key === "last-category" || key === "todo-app-selected-ai-destination-id-v1") return;
  if (key === "last-has-planned-time") {
    if (raw !== "true" && raw !== "false") fail(key);
    return;
  }
  const parsed = parseJson(raw, key);
  if (key === STORAGE_KEY) { validateAppData(parsed); return; }
  if (key === LEGACY_LONG_TASKS_KEY) { array(parsed, key, longTask); return; }
  array(parsed, key, (item, path) => {
    object(item, path);
    if (key === "todo-app-long-task-categories-v1") {
      string(item.name, `${path}.name`);
      optionalString(item, "color", path);
    } else if (key === "todo-app-ai-destinations-v1") {
      string(item.id, `${path}.id`);
      string(item.name, `${path}.name`);
      string(item.url, `${path}.url`);
    } else if (key === "todo-app-ai-fixed-instructions-v1") {
      if (typeof item.id !== "string" && typeof item.id !== "number") fail(`${path}.id`);
      string(item.text, `${path}.text`);
      if (item.enabled != null && typeof item.enabled !== "boolean") fail(`${path}.enabled`);
    } else if (key === "todo-app-ai-request-history-v1") {
      array(item.tasks, `${path}.tasks`, task);
      if (owns(item, "fixedRequests")) array(item.fixedRequests, `${path}.fixedRequests`, (rule, rulePath) => {
        object(rule, rulePath);
        string(rule.text, `${rulePath}.text`);
      });
      optionalString(item, "title", path);
    }
  });
}

export function captureStorage(storage) {
  const values = {};
  const unreadableKeys = [];
  for (const key of STORAGE_KEYS) {
    try { values[key] = storage.getItem(key); }
    catch { values[key] = null; unreadableKeys.push(key); }
  }
  return { values, unreadableKeys };
}

// Defer access to window.localStorage so a denied getter is handled by captureStorage.
export const browserStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};

function validateValues(values) {
  object(values, "storage");
  if (Object.keys(values).length !== STORAGE_KEYS.length ||
      Object.keys(values).some((key) => !STORAGE_KEYS.includes(key))) fail("storageの保存キー");
  for (const key of STORAGE_KEYS) {
    if (!owns(values, key)) fail(key);
    validateRawValue(key, values[key]);
  }
}

function dataFromValues(values) {
  const saved = values[STORAGE_KEY] === null ? {} : parseJson(values[STORAGE_KEY], STORAGE_KEY);
  // An explicit empty list is authoritative; do not resurrect deleted tasks.
  const legacy = !owns(saved, "longTasks") && values[LEGACY_LONG_TASKS_KEY] !== null
    ? parseJson(values[LEGACY_LONG_TASKS_KEY], LEGACY_LONG_TASKS_KEY) : [];
  return { ...createEmptyAppData(), ...saved, longTasks: saved.longTasks ?? legacy };
}

export function loadStorage(storage) {
  const snapshot = captureStorage(storage);
  try {
    if (snapshot.unreadableKeys.length) throw new Error("この端末の保存領域にアクセスできません。");
    validateValues(snapshot.values);
    return { data: dataFromValues(snapshot.values), error: null, snapshot };
  } catch (error) {
    return { data: null, error: error.message, snapshot };
  }
}

export function saveAppData(storage, data) {
  const raw = JSON.stringify(data);
  // Validate the same JSON that the previous save path wrote (NaN becomes null).
  validateAppData(JSON.parse(raw));
  storage.setItem(STORAGE_KEY, raw);
}

export function createBackup(storage, appData, now = new Date()) {
  const snapshot = captureStorage(storage);
  if (snapshot.unreadableKeys.length) throw new Error("保存領域を読み込めないためバックアップを作成できません。");
  validateValues(snapshot.values);
  if (appData != null) {
    const raw = JSON.stringify(appData);
    validateAppData(JSON.parse(raw));
    // The committed React state can be ahead of the passive save effect.
    // Prefer it in the file without writing to storage; keep original raw JSON
    // when it already represents the same state, including legacy defaults.
    if (snapshot.values[STORAGE_KEY] === null ||
        JSON.stringify(dataFromValues(snapshot.values)) !== raw) {
      snapshot.values[STORAGE_KEY] = raw;
    }
  }
  return { format: "floria-backup", version: 1, exportedAt: now.toISOString(), storage: snapshot.values };
}

export function createRecoveryBackup(snapshot, unsavedData = null, now = new Date()) {
  return {
    format: "floria-recovery", version: 1, exportedAt: now.toISOString(),
    storage: snapshot.values, unreadableKeys: snapshot.unreadableKeys,
    // Raw strings (including broken JSON) remain recoverable without parsing.
    ...(unsavedData ? { unsavedAppData: unsavedData } : {}),
  };
}

export function parseBackup(text) {
  const parsed = parseJson(text.replace(/^\uFEFF/, ""), "バックアップファイル");
  object(parsed, "バックアップファイル");
  let backup;
  if (owns(parsed, "format")) {
    if (parsed.format !== "floria-backup" || parsed.version !== 1) {
      throw new Error("対応していないバックアップ形式です。退避用ファイルはそのまま復元できません。");
    }
    if (typeof parsed.exportedAt !== "string" || !Number.isFinite(Date.parse(parsed.exportedAt))) fail("exportedAt");
    backup = { format: parsed.format, version: 1, exportedAt: parsed.exportedAt, storage: parsed.storage };
  } else {
    // Existing appData JSON can be restored explicitly; auxiliary keys are replaced with absence.
    validateAppData(parsed);
    backup = {
      format: "floria-backup", version: 1, exportedAt: new Date().toISOString(), legacy: true,
      storage: Object.fromEntries(STORAGE_KEYS.map((key) => [key, key === STORAGE_KEY ? JSON.stringify(parsed) : null])),
    };
  }
  validateValues(backup.storage);
  if (backup.storage[STORAGE_KEY] === null && backup.storage[LEGACY_LONG_TASKS_KEY] === null) {
    throw new Error("復元する本体データがありません。");
  }
  return backup;
}

export function summarizeBackup(backup) {
  const data = dataFromValues(backup.storage);
  return {
    tasks: data.tasks.length, longTasks: data.longTasks.length,
    dailyRecords: Object.keys(data.dailyRecords).length,
    workLogs: data.workLogs.length, timerSessions: data.timerSessions.length,
    keys: STORAGE_KEYS.filter((key) => backup.storage[key] !== null).length,
  };
}

export class RestoreError extends Error {
  constructor(message, snapshot, rollbackSucceeded) {
    super(message);
    this.name = "RestoreError";
    this.snapshot = snapshot;
    this.rollbackSucceeded = rollbackSucceeded;
  }
}

export function restoreBackup(storage, backup) {
  // Revalidate at the write boundary, even if the file preview was already validated.
  const validated = parseBackup(JSON.stringify(backup));
  const before = captureStorage(storage);
  if (before.unreadableKeys.length) throw new Error("現在のデータを退避できないため復元を中止しました。");
  const touched = [];
  const order = [...STORAGE_KEYS.filter((key) => key !== STORAGE_KEY), STORAGE_KEY];
  const write = (key, value) => value === null ? storage.removeItem(key) : storage.setItem(key, value);
  try {
    for (const key of order) {
      if (before.values[key] === validated.storage[key]) continue;
      touched.push(key);
      write(key, validated.storage[key]);
    }
    if (STORAGE_KEYS.some((key) => storage.getItem(key) !== validated.storage[key])) {
      throw new Error("保存内容を確認できませんでした。");
    }
  } catch {
    let rollbackSucceeded = true;
    for (const key of touched.reverse()) {
      try {
        if (storage.getItem(key) !== before.values[key]) write(key, before.values[key]);
      } catch { rollbackSucceeded = false; }
    }
    try {
      if (STORAGE_KEYS.some((key) => storage.getItem(key) !== before.values[key])) rollbackSucceeded = false;
    } catch { rollbackSucceeded = false; }
    throw new RestoreError(
      rollbackSucceeded
        ? "復元に失敗しました。復元前の保存データに戻しました。"
        : "復元と元に戻す処理に失敗しました。操作を停止しました。復元前のデータを退避してください。",
      before, rollbackSucceeded,
    );
  }
  return dataFromValues(validated.storage);
}

export function backupFileName(kind = "backup", now = new Date()) {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `Floria-${kind}-${stamp}.json`;
}

export function downloadJson(data, kind = "backup") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName(kind);
  document.body.appendChild(link);
  try { link.click(); }
  finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
