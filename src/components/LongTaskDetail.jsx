import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Edit3,
  GripVertical,
  ListChecks,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";

const DEFAULT_AI_URL = "https://chatgpt.com/";
const AI_DESTINATIONS_STORAGE_KEY = "todo-app-ai-destinations-v1";
const SELECTED_AI_DESTINATION_ID_STORAGE_KEY = "todo-app-selected-ai-destination-id-v1";

const defaultAiDestinations = [
  {
    id: "default-chatgpt",
    name: "ChatGPT",
    url: DEFAULT_AI_URL,
    locked: true,
  },
];

function parseDate(dateText) {
  const [y, m, d] = String(dateText).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToDateKey(dateText, diffDays) {
  const date = parseDate(dateText);
  date.setDate(date.getDate() + diffDays);
  return dateKey(date);
}

function createDateRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const result = [];
  for (let d = parseDate(startDate); d <= parseDate(endDate); d.setDate(d.getDate() + 1)) {
    result.push(dateKey(d));
  }
  return result;
}

function extractJsonText(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  const withoutFence = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const first = withoutFence.indexOf("{");
  const last = withoutFence.lastIndexOf("}");
  if (first >= 0 && last >= first) return withoutFence.slice(first, last + 1);
  return withoutFence;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;

  try {
    success = document.execCommand("copy");
  } catch {
    success = false;
  }

  document.body.removeChild(textarea);
  return success;
}

function loadAiDestinationsForReplan() {
  try {
    const saved = localStorage.getItem(AI_DESTINATIONS_STORAGE_KEY);
    if (!saved) return defaultAiDestinations;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return defaultAiDestinations;

    const merged = [
      ...defaultAiDestinations,
      ...parsed.filter((item) => item.id !== "default-chatgpt"),
    ];

    return merged.length > 0 ? merged : defaultAiDestinations;
  } catch {
    return defaultAiDestinations;
  }
}

function getSelectedAiDestinationForReplan() {
  const destinations = loadAiDestinationsForReplan();

  try {
    const saved = localStorage.getItem(SELECTED_AI_DESTINATION_ID_STORAGE_KEY);
    return (
      destinations.find((item) => item.id === saved) ??
      destinations[0] ??
      defaultAiDestinations[0]
    );
  } catch {
    return destinations[0] ?? defaultAiDestinations[0];
  }
}


function makeId() {
  return Date.now() + Math.floor(Math.random() * 10000);
}

function getTaskStart(task) {
  return task.start ?? task.startDate;
}

function getTaskEnd(task) {
  return task.end ?? task.endDate;
}

function formatDateLabel(dateText) {
  const date = parseDate(dateText);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function getDayLabel(dateText) {
  return ["日", "月", "火", "水", "木", "金", "土"][parseDate(dateText).getDay()];
}

function formatMinutes(minutes) {
  const value = Number(minutes || 0);
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (h <= 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間 ${m}分`;
}

function getRemainingDays(start, end) {
  const today = new Date();
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  if (today < startDate || today > endDate) return "期間外";
  return `${Math.floor((endDate - today) / 86400000) + 1}日`;
}

function isSubTaskCompleted(item) {
  if (item?.taskStatus === "pending") return false;
  if (item?.taskStatus === "deleted") return false;
  return item?.taskStatus === "completed" || item?.completed === true;
}

function normalizeTaskStatus(item) {
  if (item?.taskStatus === "completed") return "completed";
  if (item?.taskStatus === "pending") return "pending";
  if (item?.taskStatus === "postponed") return "postponed";
  if (item?.taskStatus === "deleted") return "deleted";
  return item?.completed ? "completed" : "pending";
}

function normalizeSubTask(item, date, index) {
  const taskStatus = normalizeTaskStatus(item);
  const completed = taskStatus === "completed";

  return {
    id: item.id ?? `${date}-${index}-${makeId()}`,
    title: item.title ?? "",
    estimatedMinutes: item.estimatedMinutes ?? "",
    actualMinutes: item.actualMinutes ?? null,
    actualSeconds: item.actualSeconds ?? null,
    memo: item.memo ?? item.detail ?? "",
    detail: item.detail ?? item.memo ?? "",
    completed,
    taskStatus,
    completedAt: completed ? item.completedAt ?? null : null,
    selected: item.selected ?? true,
    status: item.status ?? "accepted",
  };
}

function buildDailyRows(task) {
  if (!task) return [];

  const start = getTaskStart(task);
  const end = getTaskEnd(task);
  const byDate = new Map();

  if (start && end) {
    for (let d = parseDate(start); d <= parseDate(end); d.setDate(d.getDate() + 1)) {
      const key = dateKey(d);
      byDate.set(key, { id: `${task.id}-${key}`, date: key, open: false, tasks: [] });
    }
  }

  (task.dailyPlans ?? []).forEach((plan, planIndex) => {
    const date = plan.date;
    if (!date) return;

    if (!byDate.has(date)) {
      byDate.set(date, { id: `${task.id}-${date}`, date, open: false, tasks: [] });
    }

    const row = byDate.get(date);

    if (Array.isArray(plan.tasks)) {
      row.tasks = [
        ...row.tasks,
        ...plan.tasks
  .filter((item) => item?.reviewOnly !== true)
  .map((item, index) => normalizeSubTask(item, date, index)),
      ];
      return;
    }

    const hasOldTask =
      String(plan.title ?? "").trim() ||
      String(plan.memo ?? plan.detail ?? "").trim() ||
      plan.estimatedMinutes;

    if (hasOldTask) {
      row.tasks.push(normalizeSubTask(plan, date, planIndex));
    }
  });

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function serializeDailyRows(rows) {
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    tasks: (row.tasks ?? []).map((item) => {
      const taskStatus = normalizeTaskStatus(item);
      const completed = taskStatus === "completed";

      return {
        id: item.id,
        title: item.title,
        estimatedMinutes: item.estimatedMinutes === "" ? null : Number(item.estimatedMinutes),
        actualMinutes: item.actualMinutes ?? null,
        actualSeconds: item.actualSeconds ?? null,
        memo: item.memo ?? item.detail ?? "",
        detail: item.detail ?? item.memo ?? "",
        completed,
        taskStatus,
        completedAt: completed ? item.completedAt ?? new Date().toISOString() : null,
        selected: item.selected ?? true,
        status: item.status ?? "accepted",
      };
    }),
  }));
}

function buildReplanPrompt(task, dailyRows, targetEndDate) {
  const completedTasks = [];
  const incompleteTasks = [];
  const dailyTaskCounts = {};
  const todayDate = dateKey(new Date());

  dailyRows.forEach((row) => {
    const visibleTasks = (row.tasks ?? []).filter((item) => item?.taskStatus !== "deleted");
    dailyTaskCounts[row.date] = visibleTasks.length;

    visibleTasks.forEach((item) => {
      const normalized = {
        id: item.id,
        title: item.title,
        date: row.date,
        estimatedMinutes: item.estimatedMinutes === "" ? null : Number(item.estimatedMinutes ?? 0),
        details: item.detail ?? item.memo ?? "",
        taskStatus: normalizeTaskStatus(item),
        completed: isSubTaskCompleted(item),
      };

      if (isSubTaskCompleted(item)) {
        completedTasks.push(normalized);
      } else {
        incompleteTasks.push(normalized);
      }
    });
  });

  return JSON.stringify(
    {
      requestType: "replan_long_task_daily_plans",
      version: "long_task_replan_request_v1",
      instruction:
        "あなたの役割は、長期タスクの未完了小タスクだけを再配置するスケジューリングAIです。完了済み小タスクは絶対に変更せず、終了希望日までに無理のない形で再配置してください。アプリに貼り戻して読み込むため、返答は指定されたJSON構造だけにしてください。",
      assistantRole: [
        "長期タスクの未完了小タスクだけを再配置してください。",
        "完了済み小タスクは変更禁止対象です。dailyPlans に含めないでください。",
        "未完了小タスクの id は既存IDをそのまま使い、新しい task id を作らないでください。",
        "できるだけ元の日別配置と小タスクの順番を維持してください。",
        "終了希望日までに、1日に偏りすぎないように日別へ分散してください。",
      ],
      planningRules: [
        "対象は incompleteTasks に含まれる未完了小タスクのみです。",
        "completedTasks に含まれる小タスクは、変更・移動・出力のすべてを禁止します。",
        "estimatedMinutes を参考に、1日の予定時間が偏りすぎないようにしてください。",
        "既存 details がある場合は可能な限り保持してください。",
        "現在の日別配置を参考にし、必要な範囲だけ再配置してください。",
      ],
      strictOutputRules: [
        "返答は必ず ```json から始まるMarkdownコードブロックで囲んでください。",
        "コードブロック内には純粋なJSONのみを書いてください。",
        "JSON以外の文章を前後に付けないでください。",
        "説明文、補足、コメント、挨拶は一切書かないでください。",
        "コードブロック内の最初の文字は {、最後の文字は } にしてください。",
        "JSONとしてそのままJSON.parseできる形式にしてください。",
        "version を long_task_replan_v1 から変更しないでください。",
        "longTaskId を入力された長期タスクIDから変更しないでください。",
        "targetEndDate は入力された終了希望日を使ってください。",
        "dailyPlans は未完了小タスクの再配置案だけを含めてください。",
        "完了済みタスクを dailyPlans に含めないでください。",
        "task id を新規作成しないでください。",
        "task id を変更しないでください。",
        "配列やキー名を変更しないでください。",
        "trailing comma を付けないでください。",
        "markdown説明文を書かないでください。",
        "JSONの外にコメントを書かないでください。",
      ],
      outputFormat: {
        version: "long_task_replan_v1",
        longTaskId: String(task.id),
        targetEndDate,
        dailyPlans: [
          {
            date: "YYYY-MM-DD",
            tasks: [
              {
                id: "existing-incomplete-sub-task-id",
                title: "string",
                estimatedMinutes: 60,
                details: "string",
              },
            ],
          },
        ],
      },
      outputExample:
        '```json\n{\n  "version": "long_task_replan_v1",\n  "longTaskId": "長期タスクID",\n  "targetEndDate": "YYYY-MM-DD",\n  "dailyPlans": [\n    {\n      "date": "YYYY-MM-DD",\n      "tasks": [\n        {\n          "id": "既存小タスクID",\n          "title": "小タスク名",\n          "estimatedMinutes": 60,\n          "details": "必要なら詳細"\n        }\n      ]\n    }\n  ]\n}\n```',
      finalOutputInstruction:
        '返答は以下のJSONコードブロックのみです。説明文、補足、コメント、挨拶は一切書かないでください。\n\n```json\n{\n  "version": "long_task_replan_v1",\n  "longTaskId": "...",\n  "targetEndDate": "YYYY-MM-DD",\n  "dailyPlans": []\n}\n```',
      todayDate,
      targetEndDate,
      longTask: {
        id: task.id,
        title: task.title,
        startDate: getTaskStart(task),
        endDate: getTaskEnd(task),
        targetEndDate,
        originalRequest: task.aiMetadata?.originalRequest ?? "",
        overviewMemo: task.overviewMemo ?? "",
      },
      dailyPlans: dailyRows.map((row) => ({
        date: row.date,
        tasks: (row.tasks ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          estimatedMinutes:
            item.estimatedMinutes === "" || item.estimatedMinutes == null
              ? null
              : Number(item.estimatedMinutes),
          details: item.detail ?? item.memo ?? "",
          taskStatus: normalizeTaskStatus(item),
          completed: isSubTaskCompleted(item),
        })),
      })),
      completedTasks,
      incompleteTasks,
      dailyTaskCounts,
      currentDailyPlacement: dailyRows.map((row) => ({
        date: row.date,
        tasks: (row.tasks ?? [])
          .filter((item) => item?.taskStatus !== "deleted")
          .map((item) => ({
            id: item.id,
            title: item.title,
            estimatedMinutes:
              item.estimatedMinutes === "" || item.estimatedMinutes == null
                ? null
                : Number(item.estimatedMinutes),
            details: item.detail ?? item.memo ?? "",
            completed: isSubTaskCompleted(item),
            taskStatus: normalizeTaskStatus(item),
          })),
      })),
      existingSchedule: dailyRows.map((row) => ({
        date: row.date,
        taskCount: (row.tasks ?? []).filter((item) => item?.taskStatus !== "deleted").length,
        plannedMinutes: (row.tasks ?? []).reduce(
          (sum, item) => sum + Number(item.estimatedMinutes || 0),
          0
        ),
      })),
    },
    null,
    2
  );
}

function normalizeReplanData(raw, task, dailyRows, targetEndDate) {
  const parsed = JSON.parse(extractJsonText(raw));
  if (parsed.version !== "long_task_replan_v1") {
    throw new Error("version が long_task_replan_v1 ではありません");
  }

  if (String(parsed.longTaskId) !== String(task.id)) {
    throw new Error("longTaskId が現在の長期タスクと一致しません");
  }

  if (!Array.isArray(parsed.dailyPlans)) {
    throw new Error("dailyPlans が配列ではありません");
  }

  const incompleteById = new Map();
  dailyRows.forEach((row) => {
    (row.tasks ?? []).forEach((item) => {
      if (isSubTaskCompleted(item) || item?.taskStatus === "deleted") return;
      incompleteById.set(String(item.id), item);
    });
  });

  const planMap = new Map();

  parsed.dailyPlans.forEach((plan) => {
    const date = plan?.date;
    if (!date) return;

    const tasks = (plan.tasks ?? [])
      .map((item) => {
        const source = incompleteById.get(String(item?.id));
        if (!source) return null;

        return {
          ...source,
          title: item.title ?? source.title,
          estimatedMinutes:
            item.estimatedMinutes === "" || item.estimatedMinutes == null
              ? source.estimatedMinutes
              : Number(item.estimatedMinutes),
          detail: item.details ?? item.detail ?? item.memo ?? source.detail ?? source.memo ?? "",
          memo: item.details ?? item.detail ?? item.memo ?? source.memo ?? source.detail ?? "",
          selected: item.selected !== undefined ? Boolean(item.selected) : true,
          completed: false,
          taskStatus: "pending",
          completedAt: null,
          status: source.status ?? "accepted",
        };
      })
      .filter(Boolean);

    planMap.set(date, {
      id: `${task.id}-${date}`,
      date,
      open: false,
      tasks,
    });
  });

  return [...planMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function mergeReplanRows(currentRows, previewRows, task, targetEndDate) {
  const selectedById = new Map();
  previewRows.forEach((row) => {
    (row.tasks ?? []).forEach((item) => {
      if (item.selected) {
        selectedById.set(String(item.id), {
          ...item,
          completed: false,
          taskStatus: "pending",
          completedAt: null,
        });
      }
    });
  });

  const preservedRows = currentRows.map((row) => ({
    ...row,
    tasks: (row.tasks ?? []).filter((item) => {
      if (isSubTaskCompleted(item)) return true;
      return !selectedById.has(String(item.id));
    }),
  }));

  const dates = createDateRange(getTaskStart(task), targetEndDate);
  const allDates = [
    ...new Set([
      ...dates,
      ...preservedRows.map((row) => row.date),
      ...previewRows.map((row) => row.date),
    ]),
  ].sort();

  return allDates.map((date) => {
    const preserved = preservedRows.find((row) => row.date === date)?.tasks ?? [];
    const selected = (previewRows.find((row) => row.date === date)?.tasks ?? [])
      .filter((item) => selectedById.has(String(item.id)))
      .map((item) => selectedById.get(String(item.id)));

    return {
      id: `${task.id}-${date}`,
      date,
      open: preserved.length + selected.length > 0,
      tasks: [...preserved, ...selected],
    };
  });
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-1.5 text-center shadow-sm">
      <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-500">
        {icon}
      </div>
      <p className="text-[9px] font-black text-slate-500">{label}</p>
      <p className="mt-0.5 text-[12px] font-black text-slate-950">{value}</p>
    </div>
  );
}

function ReplanDayRow({
  row,
  originalCount,
  onToggleTask,
  onToggleDay,
  onToggleOpen,
  onUpdateTask,
  onDragStart,
  draggingTaskId,
  dragOffsetY = 0,
}) {
  const tasks = row.tasks ?? [];
  const selectedCount = tasks.filter((item) => item.selected).length;
  const totalMinutes = tasks.reduce((sum, item) => sum + Number(item.estimatedMinutes || 0), 0);
  const allSelected = tasks.length > 0 && selectedCount === tasks.length;
  const hasTasks = tasks.length > 0;

  return (
    <section
      data-replan-day-date={row.date}
      className={`relative overflow-visible rounded-[18px] border border-slate-100 bg-white shadow-[0_5px_14px_rgba(15,23,42,0.035)] ${
        tasks.some((item) => String(item.id) === String(draggingTaskId)) ? "z-[999998]" : "z-0"
      }`}
    >
      <div className="grid w-full grid-cols-[32px_58px_1fr_auto] items-center gap-2 px-3 py-2.5 text-left">
        <button
          type="button"
          disabled={!hasTasks}
          onClick={() => onToggleDay(row.date)}
          className={`grid h-7 w-7 place-items-center rounded-xl border ${
            allSelected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"
          } ${!hasTasks ? "opacity-40" : ""}`}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>

        <button
          type="button"
          onClick={() => onToggleOpen(row.date)}
          className="rounded-xl px-1.5 py-1 text-left active:bg-emerald-50"
        >
          <p className="text-[16px] font-black leading-none text-slate-900">
            {Number(row.date.slice(5, 7))}/{Number(row.date.slice(8, 10))}
          </p>
          <p className="mt-0.5 text-[12px] font-bold text-slate-500">({getDayLabel(row.date)})</p>
        </button>

        <button type="button" onClick={() => onToggleOpen(row.date)} className="min-w-0 text-left active:bg-slate-50">
          <p className={`truncate text-[16px] font-black ${hasTasks ? "text-slate-950" : "text-slate-300"}`}>
            {hasTasks
              ? `${tasks[0].title}${tasks.length > 1 ? ` ほか${tasks.length - 1}件` : ""}`
              : "候補なし"}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">
            採用 {selectedCount}/{tasks.length}件
            {totalMinutes > 0 ? `・${totalMinutes}分` : ""} / 変更前 {originalCount}件
          </p>
        </button>

        <button type="button" onClick={() => onToggleOpen(row.date)} className="grid h-8 w-8 place-items-center rounded-xl active:bg-slate-50">
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${row.open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {row.open && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-2">
          {tasks.length === 0 ? (
            <div className="rounded-2xl bg-white px-3 py-4 text-center text-[12px] font-bold text-slate-400">
              候補なし
            </div>
          ) : (
            tasks.map((item) => {
              const dragging = String(draggingTaskId) === String(item.id);

              return (
              <div
                key={item.id}
                data-replan-task-id={item.id}
                style={dragging ? { transform: `translate3d(0, ${dragOffsetY}px, 0) scale(1.01)` } : undefined}
                className={`relative rounded-2xl border border-slate-100 bg-white px-3 py-3 transition-all ${
                  dragging
                    ? "pointer-events-none z-[999999] opacity-95 shadow-[0_18px_38px_rgba(15,23,42,0.22)] ring-2 ring-emerald-100 duration-100"
                    : "z-0 duration-200"
                }`}
              >
                <div className="grid grid-cols-[28px_36px_1fr_54px] items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleTask(row.date, item.id)}
                    className={`grid h-7 w-7 place-items-center rounded-xl border ${
                      item.selected
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-white text-transparent"
                    }`}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </button>

                  <button
                    type="button"
                    onPointerDown={(event) => onDragStart(event, row.date, item.id)}
                    className="grid h-8 w-8 touch-none place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 active:bg-slate-100"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>

                  <input
                    value={item.title}
                    onChange={(event) =>
                      onUpdateTask(row.date, item.id, {
                        ...item,
                        title: event.target.value.slice(0, 15),
                      })
                    }
                    placeholder="タスク名"
                    maxLength={15}
                    className="h-9 min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 text-[16px] font-bold text-slate-900 outline-none focus:border-emerald-400"
                  />

                  <input
                    value={item.estimatedMinutes ?? ""}
                    onChange={(event) =>
                      onUpdateTask(row.date, item.id, {
                        ...item,
                        estimatedMinutes: event.target.value,
                      })
                    }
                    placeholder="分"
                    inputMode="numeric"
                    className="h-9 rounded-xl border border-slate-200 bg-white px-1.5 text-center text-[16px] font-black text-slate-700 outline-none focus:border-emerald-400"
                  />
                </div>

                {!dragging && (
                  <textarea
                  value={item.detail ?? item.memo ?? ""}
                  onChange={(event) =>
                    onUpdateTask(row.date, item.id, {
                      ...item,
                      detail: event.target.value,
                      memo: event.target.value,
                    })
                  }
                  placeholder="詳細内容"
                  className="mt-2 h-[72px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[16px] font-bold leading-relaxed text-slate-800 outline-none focus:border-emerald-400"
                  />
                )}
              </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

function ReplanPanel({
  task,
  dailyRows,
  targetEndDate,
  setTargetEndDate,
  jsonText,
  setJsonText,
  parseStatus,
  previewRows,
  onCopyPrompt,
  onParse,
  onToggleTask,
  onToggleDay,
  onToggleOpen,
  onUpdateTask,
  onDragStart,
  draggingTaskId,
  dragOffsetY = 0,
  onApply,
  onReset,
}) {
  const originalCounts = useMemo(() => {
    const map = new Map();
    dailyRows.forEach((row) => {
      map.set(
        row.date,
        (row.tasks ?? []).filter((item) => !isSubTaskCompleted(item) && item?.taskStatus !== "deleted").length
      );
    });
    return map;
  }, [dailyRows]);

  const selectedCount = previewRows.reduce(
    (sum, row) => sum + (row.tasks ?? []).filter((item) => item.selected).length,
    0
  );

  return (
    <section className="rounded-b-[20px] border border-t-0 border-slate-100 bg-white p-3">
      <div className="space-y-2.5">
        <div className="rounded-[18px] border border-slate-100 bg-emerald-50/50 p-3">
          <p className="text-[13px] font-black text-slate-950">AI日程調整</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-[12px] font-black text-slate-700">終了希望日</span>
          <input
            type="date"
            value={targetEndDate}
            min={getTaskStart(task)}
            onChange={(event) => setTargetEndDate(event.target.value)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-[16px] font-bold outline-none focus:border-emerald-400"
          />
        </label>

        <button
          type="button"
          onClick={onCopyPrompt}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-emerald-600 text-[15px] font-black text-white shadow-[0_10px_22px_rgba(16,185,129,0.24)] active:scale-[0.985]"
        >
          <Sparkles className="h-5 w-5" />
          AIで再編成する
        </button>

        <div className="rounded-[18px] border border-slate-100 bg-white p-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-black text-slate-950">AI返信JSON</h3>
            </div>
          </div>

          <textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            placeholder='{"version":"long_task_replan_v1",...}'
            rows={1}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[16px] font-bold text-slate-800 outline-none focus:border-emerald-400"
          />

          <button
            type="button"
            onClick={onParse}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-[13px] font-black text-emerald-700 active:bg-emerald-100"
          >
            <RefreshCcw className="h-4 w-4" />
            再編成案を確認する
          </button>

          {parseStatus && (
            <div className={`mt-2 rounded-2xl px-3 py-2 text-[12px] font-bold ${parseStatus.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-500"}`}>
              {parseStatus.message}
            </div>
          )}
        </div>

        {previewRows.length > 0 && (
          <>
            <section className="grid grid-cols-3 gap-1.5">
              <div className="rounded-[14px] border border-slate-100 bg-white p-2 text-center">
                <CalendarDays className="mx-auto mb-0.5 h-4 w-4 text-emerald-500" />
                <p className="text-[9px] font-black text-slate-400">日数</p>
                <p className="text-[14px] font-black text-slate-950">{previewRows.length}日</p>
              </div>

              <div className="rounded-[14px] border border-slate-100 bg-white p-2 text-center">
                <ListChecks className="mx-auto mb-0.5 h-4 w-4 text-emerald-500" />
                <p className="text-[9px] font-black text-slate-400">採用</p>
                <p className="text-[14px] font-black text-slate-950">{selectedCount}件</p>
              </div>

              <div className="rounded-[14px] border border-slate-100 bg-white p-2 text-center">
                <Target className="mx-auto mb-0.5 h-4 w-4 text-emerald-500" />
                <p className="text-[9px] font-black text-slate-400">終了日</p>
                <p className="text-[14px] font-black text-slate-950">
                  {targetEndDate ? `${Number(targetEndDate.slice(5, 7))}/${Number(targetEndDate.slice(8, 10))}` : "-"}
                </p>
              </div>
            </section>

            <section className="space-y-1.5">
              {previewRows.map((row) => (
                <ReplanDayRow
                  key={row.date}
                  row={row}
                  originalCount={originalCounts.get(row.date) ?? 0}
                  onToggleTask={onToggleTask}
                  onToggleDay={onToggleDay}
                  onToggleOpen={onToggleOpen}
                  onUpdateTask={onUpdateTask}
                  onDragStart={onDragStart}
                  draggingTaskId={draggingTaskId}
                  dragOffsetY={dragOffsetY}
                />
              ))}
            </section>

            <section className="rounded-[16px] bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
              <Check className="mr-1 inline h-3.5 w-3.5" />
              採用チェックが入った小タスクだけ反映されます。未採用の小タスクは元の日付に残ります。
            </section>

            <div className="grid grid-cols-2 gap-2 pb-2">
              <button
                type="button"
                onClick={onReset}
                className="flex h-11 items-center justify-center gap-1 rounded-[16px] border border-emerald-200 bg-white text-[12px] font-black text-emerald-700 active:bg-emerald-50"
              >
                <RefreshCcw className="h-4 w-4" />
                作り直し
              </button>

              <button
                type="button"
                onClick={onApply}
                disabled={selectedCount === 0}
                className={`flex h-11 items-center justify-center gap-1 rounded-[16px] text-[13px] font-black shadow-[0_10px_20px_rgba(16,185,129,0.22)] active:scale-[0.985] ${
                  selectedCount === 0
                    ? "bg-slate-200 text-white shadow-none"
                    : "bg-emerald-600 text-white"
                }`}
              >
                <Check className="h-4 w-4" />
                この内容で反映する
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function LongTaskDetail({
  task,
  onClose,
  onEdit,
  onDelete,
  onUpdateDailyPlan,
  onUpdateTask,
  onOpenAiReplan,
}) {
  if (!task) return null;

  const dailyRows = useMemo(() => buildDailyRows(task), [task]);
  const todayKey = dateKey(new Date());
  const defaultTargetEndDate = addDaysToDateKey(todayKey, 7);
  const todayRow = dailyRows.find((row) => row.date === todayKey) ?? dailyRows[0];
  const listScrollRef = useRef(null);
const startScrollTopRef = useRef(0);


const autoScrollWhileDragging = (clientY) => {
  const container = listScrollRef.current;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const edge = 72;
  const speed = 16;

  if (clientY < rect.top + edge) {
    container.scrollTop -= speed;
    return;
  }

  if (clientY > rect.bottom - edge) {
    container.scrollTop += speed;
  }
};

  const start = getTaskStart(task);
  const end = getTaskEnd(task);

  const focusDateKey = (() => {
    if (!start || !end) return todayKey;

    const today = new Date();
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (today >= startDate && today <= endDate) return todayKey;
    return start;
  })();

  const [expandedId, setExpandedId] = useState(todayRow?.id ?? null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("daily");
  const [overviewMemo, setOverviewMemo] = useState(task.overviewMemo || "");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMinutes, setDraftMinutes] = useState("");
  const [draftMemo, setDraftMemo] = useState("");
  const [targetEndDate, setTargetEndDate] = useState(defaultTargetEndDate);
  const [replanJsonText, setReplanJsonText] = useState("");
  const [replanParseStatus, setReplanParseStatus] = useState(null);
  const [replanPreviewRows, setReplanPreviewRows] = useState([]);
  const [draggingReplanTaskId, setDraggingReplanTaskId] = useState(null);
  const [replanDragOffsetY, setReplanDragOffsetY] = useState(0);
  const [draggingSubTaskId, setDraggingSubTaskId] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragInfoRef = useRef(null);
  const replanDragInfoRef = useRef(null);
  const replanStartYRef = useRef(0);
  const replanStartScrollYRef = useRef(0);
  const previousBodyTouchActionRef = useRef("");
  const previousBodyUserSelectRef = useRef("");

  useEffect(() => {
  setOverviewMemo(task.overviewMemo || "");
  setTargetEndDate(addDaysToDateKey(dateKey(new Date()), 7));
  setReplanJsonText("");
  setReplanParseStatus(null);
  setReplanPreviewRows([]);

  window.requestAnimationFrame(() => {
    const target = listScrollRef.current?.querySelector(`[data-date="${focusDateKey}"]`);
    target?.scrollIntoView({ block: "start" });
  });
}, [task, focusDateKey]);

  const allSubTasks = dailyRows.flatMap((row) => row.tasks ?? []);
  const completedCount = allSubTasks.filter((item) => isSubTaskCompleted(item)).length;
  const totalTaskCount = allSubTasks.length;
  const remainingTasks = allSubTasks.filter(
    (item) => String(item.title ?? "").trim() && !isSubTaskCompleted(item)
  ).length;
  const totalActualMinutes = allSubTasks.reduce(
    (sum, item) => sum + Number(item.actualMinutes || 0),
    0
  );
  const todayPlannedMinutes = (todayRow?.tasks ?? []).reduce(
    (sum, item) => sum + Number(item.estimatedMinutes || 0),
    0
  );
    const progress = totalTaskCount === 0 ? 0 : Math.round((completedCount / totalTaskCount) * 100);
  const isLongTaskCompleted = task.taskStatus === "completed" || task.completed === true;
  const canCompleteLongTask =
    totalTaskCount > 0 &&
    completedCount === totalTaskCount &&
    !isLongTaskCompleted;

  const completeLongTask = () => {
    if (!canCompleteLongTask) return;

    onUpdateTask?.({
      ...task,
      completed: true,
      taskStatus: "completed",
      completedAt: new Date().toISOString(),
      status: "completed",
      updatedAt: new Date().toISOString(),
    });
  };

  const commitRows = (nextRows, changedItem = null) => {
    const serialized = serializeDailyRows(nextRows);
    onUpdateDailyPlan?.(task, changedItem, serialized);
  };

  const updateTaskItem = (rowId, taskId, updater) => {
    const nextRows = dailyRows.map((row) => {
      if (row.id !== rowId) return row;

      return {
        ...row,
        tasks: (row.tasks ?? []).map((item) =>
          String(item.id) === String(taskId) ? updater(item) : item
        ),
      };
    });

    const changedRow = nextRows.find((row) => row.id === rowId);
    const changedItem = changedRow?.tasks?.find((item) => String(item.id) === String(taskId));
    commitRows(nextRows, changedItem);
  };

  const addSubTask = (row) => {
  const newItem = {
    id: makeId(),
    title: "",
    estimatedMinutes: "",
    actualMinutes: null,
    actualSeconds: null,
    memo: "",
    detail: "",
    completed: false,
    taskStatus: "pending",
    completedAt: null,
    selected: true,
    status: "accepted",
  };

  const nextRows = dailyRows.map((item) =>
    item.id === row.id ? { ...item, tasks: [...(item.tasks ?? []), newItem] } : item
  );

  commitRows(nextRows, newItem);

requestAnimationFrame(() => {
  setExpandedId(row.id);
  setEditingTaskId(newItem.id);
  setDraftTitle("");
  setDraftMinutes("");
  setDraftMemo("");
});
};

  const deleteSubTask = (rowId, taskId) => {
    const nextRows = dailyRows.map((row) =>
      row.id === rowId
        ? { ...row, tasks: (row.tasks ?? []).filter((item) => String(item.id) !== String(taskId)) }
        : row
    );

    setEditingTaskId(null);
    commitRows(nextRows);
  };

  const toggleSubTaskCompleted = (rowId, item) => {
    const nextCompleted = !isSubTaskCompleted(item);

    updateTaskItem(rowId, item.id, (current) => ({
      ...current,
      completed: nextCompleted,
      taskStatus: nextCompleted ? "completed" : "pending",
      completedAt: nextCompleted ? new Date().toISOString() : null,
      status: current.status ?? "accepted",
    }));
  };

  const startEdit = (item) => {
    setEditingTaskId(item.id);
    setDraftTitle(item.title || "");
    setDraftMinutes(item.estimatedMinutes || "");
    setDraftMemo(item.memo || item.detail || "");
  };

  const saveDraft = (row, item) => {
    const completed = isSubTaskCompleted(item);

    updateTaskItem(row.id, item.id, (current) => ({
      ...current,
      title: draftTitle,
      estimatedMinutes: draftMinutes === "" ? "" : Number(draftMinutes),
      memo: draftMemo,
      detail: draftMemo,
      completed,
      taskStatus: completed ? "completed" : "pending",
      completedAt: completed ? current.completedAt ?? new Date().toISOString() : null,
      status: current.status ?? "accepted",
    }));

    setEditingTaskId(null);
  };


  const startDragSubTask = (event, rowId, taskId) => {
    event.preventDefault();
    event.stopPropagation();

    previousBodyTouchActionRef.current = document.body.style.touchAction;
    previousBodyUserSelectRef.current = document.body.style.userSelect;
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";

    dragInfoRef.current = {
  rowId,
  taskId,
  startY: event.clientY,
  startScrollTop: listScrollRef.current?.scrollTop ?? 0,
  targetRowId: rowId,
};

startScrollTopRef.current = listScrollRef.current?.scrollTop ?? 0;

    setDraggingSubTaskId(taskId);
    setDragOffsetY(0);
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragInfoRef.current) return;
      event.preventDefault();

      autoScrollWhileDragging(event.clientY);

const currentScrollTop = listScrollRef.current?.scrollTop ?? 0;
const nextOffsetY =
  event.clientY -
  dragInfoRef.current.startY +
  (currentScrollTop - startScrollTopRef.current);

setDragOffsetY(nextOffsetY);

      const rows = Array.from(
  listScrollRef.current?.querySelectorAll("[data-date]") ?? []
);

const targetElement = rows.find((rowElement) => {
  const rect = rowElement.getBoundingClientRect();
  return (
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom &&
    event.clientX >= rect.left &&
    event.clientX <= rect.right
  );
});

const targetDate = targetElement?.dataset?.date ?? null;
const targetRow = targetDate
  ? dailyRows.find((row) => row.date === targetDate)
  : null;

if (targetRow) {
  dragInfoRef.current.targetRowId = targetRow.id;
}
    };

    const handlePointerUp = () => {
      if (!dragInfoRef.current) return;

      const { rowId, taskId, targetRowId } = dragInfoRef.current;
      dragInfoRef.current = null;
      setDraggingSubTaskId(null);
      setDragOffsetY(0);
      document.body.style.touchAction = previousBodyTouchActionRef.current;
      document.body.style.userSelect = previousBodyUserSelectRef.current;

      if (!targetRowId || targetRowId === rowId) return;

      let movingTask = null;

      const nextRows = dailyRows.map((row) => {
        if (row.id !== rowId) return row;

        return {
          ...row,
          tasks: (row.tasks ?? []).filter((item) => {
            if (String(item.id) !== String(taskId)) return true;
            movingTask = item;
            return false;
          }),
        };
      }).map((row) => {
        if (row.id !== targetRowId || !movingTask) return row;

        return {
          ...row,
          tasks: [...(row.tasks ?? []), movingTask],
        };
      });

      if (movingTask) {
        commitRows(nextRows, movingTask);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dailyRows]);

  const updateOverviewMemo = (value) => {
    setOverviewMemo(value);
    onUpdateTask?.({ ...task, overviewMemo: value });
  };

  const copyReplanPrompt = async () => {
    const prompt = buildReplanPrompt(task, dailyRows, targetEndDate || end || todayKey);
    const aiDestination = getSelectedAiDestinationForReplan();
    const copied = await copyTextToClipboard(prompt);
    setReplanParseStatus(
      copied
        ? { type: "success", message: "AIへの依頼内容をコピーしました。" }
        : { type: "error", message: "コピーできませんでした。手動でコピーしてください。" }
    );

    if (copied) {
      setTimeout(() => {
        window.open(aiDestination?.url || DEFAULT_AI_URL, "_blank", "noopener,noreferrer");
      }, 150);
    }
  };

  const parseReplanJson = () => {
    try {
      const normalized = normalizeReplanData(
        replanJsonText,
        task,
        dailyRows,
        targetEndDate || end || todayKey
      );
      setReplanPreviewRows(normalized);
      setReplanParseStatus({ type: "success", message: "再編成案を読み込みました。" });
    } catch (error) {
      setReplanParseStatus({
        type: "error",
        message: `読み込み失敗: ${error.message}`,
      });
    }
  };

  const toggleReplanTask = (date, taskId) => {
    setReplanPreviewRows((current) =>
      current.map((row) =>
        row.date === date
          ? {
              ...row,
              tasks: (row.tasks ?? []).map((item) =>
                String(item.id) === String(taskId)
                  ? { ...item, selected: !item.selected }
                  : item
              ),
            }
          : row
      )
    );
  };

  const toggleReplanDay = (date) => {
    setReplanPreviewRows((current) =>
      current.map((row) => {
        if (row.date !== date || (row.tasks ?? []).length === 0) return row;
        const allSelected = row.tasks.every((item) => item.selected);
        return {
          ...row,
          tasks: row.tasks.map((item) => ({ ...item, selected: !allSelected })),
        };
      })
    );
  };

  const toggleReplanOpen = (date) => {
    setReplanPreviewRows((current) =>
      current.map((row) => (row.date === date ? { ...row, open: !row.open } : row))
    );
  };

  const updateReplanTask = (date, taskId, next) => {
    setReplanPreviewRows((current) =>
      current.map((row) =>
        row.date === date
          ? {
              ...row,
              tasks: (row.tasks ?? []).map((item) =>
                String(item.id) === String(taskId) ? next : item
              ),
            }
          : row
      )
    );
  };

  const moveReplanTask = (fromDate, taskId, toDate, beforeTaskId = null, placeAfter = false) => {
    if (!toDate) return;

    setReplanPreviewRows((current) => {
      let movingTask = null;

      const withoutMoving = current.map((row) => ({
        ...row,
        tasks: (row.tasks ?? []).filter((item) => {
          if (row.date === fromDate && String(item.id) === String(taskId)) {
            movingTask = item;
            return false;
          }

          return true;
        }),
      }));

      if (!movingTask) return current;

      return withoutMoving.map((row) => {
        if (row.date !== toDate) return row;

        const nextTasks = [...(row.tasks ?? [])];
        const targetIndex = beforeTaskId
          ? nextTasks.findIndex((item) => String(item.id) === String(beforeTaskId))
          : -1;

        const insertIndex =
          targetIndex >= 0 ? targetIndex + (placeAfter ? 1 : 0) : nextTasks.length;

        nextTasks.splice(insertIndex, 0, movingTask);

        return {
          ...row,
          tasks: nextTasks,
        };
      });
    });
  };

  const startReplanDrag = (event, fromDate, taskId) => {
    event.preventDefault();
    event.stopPropagation();

    replanDragInfoRef.current = {
      fromDate,
      taskId,
    };

    replanStartYRef.current = event.clientY;
    replanStartScrollYRef.current = window.scrollY;
    previousBodyTouchActionRef.current = document.body.style.touchAction;
    previousBodyUserSelectRef.current = document.body.style.userSelect;

    setDraggingReplanTaskId(taskId);
    setReplanDragOffsetY(0);
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!replanDragInfoRef.current) return;

      event.preventDefault();

      setReplanDragOffsetY(
        event.clientY -
          replanStartYRef.current +
          (window.scrollY - replanStartScrollYRef.current)
      );

      const edgeThreshold = 110;
      const scrollSpeed = 18;

      if (event.clientY < edgeThreshold) {
        window.scrollBy({ top: -scrollSpeed, behavior: "auto" });
      } else if (window.innerHeight - event.clientY < edgeThreshold) {
        window.scrollBy({ top: scrollSpeed, behavior: "auto" });
      }
    };

    const handlePointerUp = (event) => {
      if (!replanDragInfoRef.current) return;

      const draggingElement = document.querySelector(
        `[data-replan-task-id="${replanDragInfoRef.current.taskId}"]`
      );

      if (draggingElement) {
        draggingElement.style.pointerEvents = "none";
        draggingElement.style.display = "none";
      }

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const dayElement = element?.closest?.("[data-replan-day-date]");
      const taskElement = element?.closest?.("[data-replan-task-id]");
      const toDate = dayElement?.dataset?.replanDayDate;
      const beforeTaskId = taskElement?.dataset?.replanTaskId ?? null;
      const targetRect = taskElement?.getBoundingClientRect?.();
      const placeAfter = targetRect ? event.clientY > targetRect.top + targetRect.height / 2 : false;

      if (draggingElement) {
        draggingElement.style.display = "";
        draggingElement.style.pointerEvents = "";
      }

      moveReplanTask(
        replanDragInfoRef.current.fromDate,
        replanDragInfoRef.current.taskId,
        toDate,
        beforeTaskId,
        placeAfter
      );

      replanDragInfoRef.current = null;
      setDraggingReplanTaskId(null);
      setReplanDragOffsetY(0);
      document.body.style.touchAction = previousBodyTouchActionRef.current;
      document.body.style.userSelect = previousBodyUserSelectRef.current;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  const applyReplan = () => {
    const nextRows = mergeReplanRows(
      dailyRows,
      replanPreviewRows,
      task,
      targetEndDate || end || todayKey
    );
    const changedItems = replanPreviewRows.flatMap((row) =>
      (row.tasks ?? []).filter((item) => item.selected)
    );

    onUpdateDailyPlan?.(task, changedItems[0] ?? null, serializeDailyRows(nextRows));
    setReplanParseStatus({ type: "success", message: "再編成案を反映しました。" });
    setReplanPreviewRows([]);
    setReplanJsonText("");
  };

  const resetReplan = () => {
    setReplanPreviewRows([]);
    setReplanJsonText("");
    setReplanParseStatus(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fbfcfb] text-slate-950">
      <div className="mx-auto flex h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-[#fbfcfb]">
        <header className="shrink-0 border-b border-slate-100 bg-white px-3 pt-[calc(6px+env(safe-area-inset-top))]">
          <div className="flex h-12 items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-2xl active:bg-slate-100"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>

            <h1 className="text-[18px] font-black tracking-[-0.04em]">
              長期タスクの詳細
            </h1>

            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-2xl active:bg-slate-100"
            >
              <MoreHorizontal className="h-6 w-6" />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3">
          <section className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-600">
                  長期タスク
                </div>

                <h2 className="truncate text-[19px] font-black leading-tight tracking-[-0.04em]">
                  {task.title}
                </h2>

                <div className="mt-2 flex items-center gap-2 text-[12px] font-bold leading-snug text-slate-500">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span className="break-words">
                    {formatDateLabel(start)} 〜 {formatDateLabel(end)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-start gap-2">
                <div className="pt-10 text-center">
                  <p className="text-[11px] font-black text-slate-500">進捗</p>
                  <p className="text-[24px] font-black leading-none text-emerald-600">
                    {progress}%
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onEdit?.(task)}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 text-emerald-500 active:bg-emerald-50"
                >
                  <Edit3 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${progress}%` }}
              />
            </div>

                        <div className="mt-3 grid grid-cols-4 gap-2">
              <MiniStat
                icon={<CalendarDays className="h-4 w-4" />}
                label="残り期間"
                value={getRemainingDays(start, end)}
              />
              <MiniStat
                icon={<ListChecks className="h-4 w-4" />}
                label="残りタスク数"
                value={`${remainingTasks}件`}
              />
              <MiniStat
                icon={<Clock className="h-4 w-4" />}
                label="総作業時間"
                value={formatMinutes(totalActualMinutes)}
              />
              <MiniStat
                icon={<Target className="h-4 w-4" />}
                label="今日の予定"
                value={todayPlannedMinutes ? formatMinutes(todayPlannedMinutes) : "—"}
              />
            </div>

            {totalTaskCount === 0 ? (
              <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-center">
                <p className="text-[12px] font-black text-slate-500">
                  完了するには小タスクを1つ以上追加してください
                </p>
                <p className="mt-1 text-[10px] font-bold text-slate-400">
                  適当な確認用タスクでも大丈夫です。
                </p>
              </div>
            ) : isLongTaskCompleted ? (
              <div className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2.5 text-center">
                <p className="text-[12px] font-black text-emerald-700">
                  この長期タスクは完了済みです
                </p>
              </div>
            ) : canCompleteLongTask ? (
              <button
                type="button"
                onClick={completeLongTask}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(16,185,129,0.24)] active:scale-[0.99]"
              >
                <CheckCircle2 className="h-5 w-5" />
                この長期タスクを完了する
              </button>
            ) : (
              <div className="mt-3 grid grid-cols-[1fr_104px] gap-2">
                <div className="rounded-2xl bg-amber-50 px-3 py-2.5 text-center">
                  <p className="text-[12px] font-black text-amber-700">
                    未完了の小タスクがあります
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-amber-600">
                    すべての小タスクを達成すると完了ボタンが表示されます。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAiReplan?.(task)}
                  className="flex min-h-[58px] items-center justify-center rounded-2xl bg-emerald-600 px-2 text-center text-[12px] font-black leading-snug text-white shadow-[0_10px_22px_rgba(16,185,129,0.20)] active:scale-[0.99]"
                >
                  AI日程調整
                </button>
              </div>
            )}
          </section>

          <div className="mt-3 grid grid-cols-2 rounded-t-[16px] bg-white text-[12px] font-black">
            <button
              type="button"
              onClick={() => setActiveTab("daily")}
              className={`h-10 text-[12px] font-black ${
                activeTab === "daily"
                  ? "border-b-2 border-emerald-500 bg-emerald-50/60 text-emerald-600"
                  : "border-b border-slate-100 text-slate-400"
              }`}
            >
              日別の予定
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("memo")}
              className={`h-10 text-[12px] font-black ${
                activeTab === "memo"
                  ? "border-b-2 border-emerald-500 bg-emerald-50/60 text-emerald-600"
                  : "border-b border-slate-100 text-slate-400"
              }`}
            >
              概要・メモ
            </button>
          </div>

          {activeTab === "daily" && (
            <section
              ref={listScrollRef}
              className="max-h-[392px] overflow-y-auto rounded-b-[20px] border border-t-0 border-slate-100 bg-white"
            >
              {dailyRows.map((row) => {
                const day = getDayLabel(row.date);
                const isSunday = day === "日";
                const isSaturday = day === "土";
                const isExpanded = expandedId === row.id;
                const tasks = row.tasks ?? [];
                const completedInDay = tasks.filter((item) => isSubTaskCompleted(item)).length;
                const plannedInDay = tasks.reduce(
                  (sum, item) => sum + Number(item.estimatedMinutes || 0),
                  0
                );
                const firstTitle = tasks[0]?.title || "—";
                const allDone = tasks.length > 0 && completedInDay === tasks.length;

                return (
                  <div
                    key={row.id}
                    data-date={row.date}
                    className={`border-b border-slate-100 last:border-b-0 ${
                      isExpanded ? "bg-emerald-50/20" : "bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      className="grid w-full grid-cols-[48px_28px_1fr_auto] items-center gap-1 px-3 py-3 text-left"
                    >
                      <p
                        className={`text-[12px] font-black ${
                          isSunday
                            ? "text-red-500"
                            : isSaturday
                              ? "text-blue-500"
                              : row.date === todayKey
                                ? "text-emerald-600"
                                : "text-slate-700"
                        }`}
                      >
                        {parseDate(row.date).getMonth() + 1}/{parseDate(row.date).getDate()}（{day}）
                      </p>

                      <div
                        className={`grid h-6 w-6 place-items-center rounded-full border ${
                          allDone || row.date === todayKey
                            ? "border-emerald-500 text-emerald-500"
                            : "border-slate-300 text-slate-300"
                        }`}
                      >
                        {allDone ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : row.date === todayKey ? (
                          <div className="h-4 w-4 rounded-full bg-emerald-500" />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`truncate text-[13px] font-black ${
                            tasks.length > 0 ? "text-slate-950" : "text-slate-300"
                          }`}
                        >
                          {firstTitle}
                          {tasks.length > 1 ? ` ほか${tasks.length - 1}件` : ""}
                        </p>

                        {tasks.length > 0 && (
                          <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                            完了 {completedInDay}/{tasks.length}件
                          </p>
                        )}
                      </div>

                      <div className="text-[11px] font-black text-slate-400">
                        {plannedInDay ? <span>予定 {formatMinutes(plannedInDay)}</span> : <span>未設定</span>}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 px-3 pb-3">
                        {tasks.length === 0 ? (
                          <div className="rounded-2xl bg-emerald-50/40 p-3 text-center text-[12px] font-bold text-slate-400">
                            この日の小タスクはありません
                          </div>
                        ) : (
                          tasks.map((item) => {
                            const isEditing = String(editingTaskId) === String(item.id);
                            const completed = isSubTaskCompleted(item);

                            return (
                              <div
                                key={item.id}
                                style={String(draggingSubTaskId) === String(item.id) ? { transform: `translate3d(0, ${dragOffsetY}px, 0) scale(1.015)` } : undefined}
                                className={`rounded-2xl bg-emerald-50/40 p-3 transition-transform ${String(draggingSubTaskId) === String(item.id) ? "pointer-events-none relative z-[999] bg-white opacity-95 shadow-[0_18px_40px_rgba(15,23,42,0.20)] ring-1 ring-slate-200" : ""}`}
                              >
                                {isEditing ? (
                                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <input
                                        value={draftTitle}
                                        onChange={(e) => setDraftTitle(e.target.value)}
                                        placeholder="タスク名"
                                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[16px] font-medium placeholder:text-slate-300 outline-none focus:border-emerald-400"
                                      />

                                      <div className="flex shrink-0 items-center">
                                        <input
                                          value={draftMinutes === "" ? "" : Number(draftMinutes) / 60}
                                          onChange={(e) => setDraftMinutes(Number(e.target.value || 0) * 60)}
                                          inputMode="numeric"
                                          className="h-10 w-[58px] rounded-xl border border-slate-200 bg-white px-2 text-center text-[16px] font-black outline-none focus:border-emerald-400"
                                        />
                                        <span className="ml-1.5 text-[11px] font-black text-slate-500">
                                          時間
                                        </span>
                                      </div>
                                    </div>

                                    <textarea
                                      value={draftMemo}
                                      onChange={(e) => setDraftMemo(e.target.value)}
                                      placeholder="タスクの詳細内容"
                                      rows={3}
                                      className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[16px] font-medium placeholder:text-slate-300 outline-none focus:border-emerald-400"
                                    />

                                    <div className="mt-3 flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditingTaskId(null)}
                                        className="h-10 w-[88px] rounded-xl border border-slate-200 bg-white text-[13px] font-black text-slate-700 active:bg-slate-50"
                                      >
                                        キャンセル
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => saveDraft(row, item)}
                                        className="h-10 w-[88px] rounded-xl bg-emerald-500 text-[13px] font-black text-white active:bg-emerald-600"
                                      >
                                        保存
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-start gap-2">
                                      <button
                                        type="button"
                                        onPointerDown={(event) => startDragSubTask(event, row.id, item.id)}
                                        className={`mt-0.5 grid h-7 w-7 shrink-0 touch-none place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 active:bg-slate-50 ${
                                          String(draggingSubTaskId) === String(item.id) ? "shadow-[0_12px_24px_rgba(15,23,42,0.18)] ring-2 ring-emerald-100" : ""
                                        }`}
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </button>

                                      <span
                                        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                                          completed
                                            ? "border-emerald-500 bg-emerald-500 text-white"
                                            : "border-slate-300 bg-white text-transparent"
                                        }`}
                                      >
                                        <CheckCircle2 className="h-5 w-5" />
                                      </span>

                                      <div className="min-w-0 flex-1">
                                        <p
                                          className={`text-[13px] font-black ${
                                            completed
                                              ? "text-slate-400"
                                              : "text-slate-950"
                                          }`}
                                        >
                                          {item.title || "タスク名なし"}
                                        </p>

                                        <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                                          {item.estimatedMinutes
                                            ? `予定 ${formatMinutes(item.estimatedMinutes)}`
                                            : "予定時間なし"}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => startEdit(item)}
                                        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-emerald-300 bg-white text-emerald-600"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => deleteSubTask(row.id, item.id)}
                                        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-red-100 bg-white text-red-400"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>

                                    {!draggingSubTaskId && (
  <div className="mt-2 min-h-[58px] rounded-xl bg-white/60 px-3 py-2.5 text-[13px] font-medium leading-relaxed text-slate-700">
    {item.memo || item.detail ? (
      <p>{item.memo || item.detail}</p>
    ) : (
      <p className="text-slate-400">詳細はまだありません</p>
    )}
  </div>
)}
                                  </>
                                )}
                              </div>
                            );
                          })
                        )}

                        <button
                          type="button"
                          onClick={() => addSubTask(row)}
                          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-2xl border border-emerald-100 bg-white text-[12px] font-black text-emerald-600 active:bg-emerald-50"
                        >
                          <Plus className="h-4 w-4" />
                          この日に小タスク追加
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {activeTab === "memo" && (
            <section className="space-y-3 rounded-b-[20px] border border-t-0 border-slate-100 bg-white p-3">
              {task.aiMetadata?.originalRequest && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="text-[12px] font-black text-emerald-700">
                    元のAI作成依頼
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12px] font-bold leading-relaxed text-slate-600">
                    {task.aiMetadata.originalRequest}
                  </p>
                </div>
              )}

              <textarea
                value={overviewMemo}
                onChange={(e) => updateOverviewMemo(e.target.value)}
                placeholder="長期タスク全体のメモ"
                rows={10}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[16px] font-medium outline-none placeholder:text-slate-300 focus:border-emerald-400"
              />
            </section>
          )}

          {deleteConfirmOpen ? (
            <div className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-3">
              <p className="text-center text-[12px] font-bold text-red-500">
                この長期タスクを削除しますか？
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="h-10 rounded-xl border border-slate-200 bg-white text-[13px] font-black text-slate-600 active:bg-slate-50"
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  onClick={() => onDelete?.(task)}
                  className="h-10 rounded-xl bg-red-500 text-[13px] font-black text-white active:bg-red-600"
                >
                  削除する
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="mt-1 h-10 w-full rounded-2xl text-[12px] font-black text-red-400 active:bg-red-50"
            >
              この長期タスクを削除
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
