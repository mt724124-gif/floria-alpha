import React, { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clipboard,
  Clock,
  GripVertical,
  HelpCircle,
  Plus,
  RefreshCcw,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";

const DEFAULT_AI_URL = "https://chatgpt.com/";
const AI_DESTINATIONS_STORAGE_KEY = "todo-app-ai-destinations-v1";
const SELECTED_AI_DESTINATION_ID_STORAGE_KEY = "todo-app-selected-ai-destination-id-v1";

const today = new Date();

const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseDateKey = (dateKey) => {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const addDaysToDateKey = (dateKey, days) => formatDateKey(addDays(parseDateKey(dateKey), days));

const getNextDateKey = (dateKey, days = 7) => addDaysToDateKey(dateKey, days);

const defaultAiDestinations = [
  {
    id: "default-chatgpt",
    name: "ChatGPT",
    url: DEFAULT_AI_URL,
    locked: true,
  },
];

const initialRequestTasks = [
  {
    id: 1,
    title: "",
    startDate: formatDateKey(today),
    endDate: formatDateKey(addDays(today, 7)),
    detail: "",
    open: true,
  },
];

const sampleAiJson = {
  version: "long_task_plan_v1",
  longTasks: [
    {
      title: "学会ポスター作成",
      startDate: "2026-05-22",
      endDate: "2026-05-29",
      estimatedMinutes: 360,
      dailyPlans: [
        {
          date: "2026-05-22",
          tasks: [
            {
              title: "構成を決める",
              estimatedMinutes: 60,
              detail: "ポスター全体の構成、見出し、図表の配置を決める。",
              selected: true,
            },
            {
              title: "文献を確認",
              estimatedMinutes: 45,
              detail: "背景に使う文献を確認し、引用候補を整理する。",
              selected: true,
            },
          ],
        },
        {
          date: "2026-05-23",
          tasks: [],
        },
        {
          date: "2026-05-24",
          tasks: [
            {
              title: "図表を整理",
              estimatedMinutes: 60,
              detail: "使う図表候補を整理し、必要な修正点をメモする。",
              selected: true,
            },
          ],
        },
      ],
    },
  ],
};

function toSlashDate(dateKey) {
  if (!dateKey) return "未設定";
  return dateKey.replaceAll("-", "/");
}

function getDayLabel(dateKey) {
  if (!dateKey) return "";
  const date = parseDateKey(dateKey);
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const s = parseDateKey(start);
  const e = parseDateKey(end);
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function shortHoursLabel(minutes) {
  if (minutes == null || minutes === "" || Number(minutes) <= 0) return "未設定";
  const h = Number(minutes) / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

function makeId() {
  return Date.now() + Math.floor(Math.random() * 10000);
}

function normalizeUrl(url) {
  const text = String(url ?? "").trim();
  if (!text) return "";
  if (text.startsWith("http://") || text.startsWith("https://")) return text;
  return `https://${text}`;
}

function createDateRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const rows = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    rows.push(formatDateKey(d));
  }
  return rows;
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

function loadAiDestinations() {
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

function loadSelectedAiDestinationId(destinations) {
  try {
    const saved = localStorage.getItem(SELECTED_AI_DESTINATION_ID_STORAGE_KEY);
    if (saved && destinations.some((item) => item.id === saved)) return saved;
    return destinations[0]?.id ?? "default-chatgpt";
  } catch {
    return destinations[0]?.id ?? "default-chatgpt";
  }
}

function normalizePlanTask(taskLike, taskIndex, dayIndex, subIndex) {
  return {
    id: makeId() + taskIndex * 100000 + dayIndex * 1000 + subIndex,
    title: String(taskLike?.title ?? taskLike?.content ?? "タスク").slice(0, 15),
    estimatedMinutes:
      taskLike?.estimatedMinutes ?? taskLike?.estimated_minutes ?? taskLike?.minutes ?? "",
    detail: taskLike?.detail ?? taskLike?.memo ?? taskLike?.description ?? "",
    selected: taskLike?.selected !== undefined ? Boolean(taskLike.selected) : true,
  };
}

function normalizeDailyPlans(task, taskIndex) {
  const startDate = task.startDate ?? task.start_date ?? task.from ?? "";
  const endDate = task.endDate ?? task.end_date ?? task.deadline ?? task.to ?? "";
  const rawPlans = task.dailyPlans ?? task.daily_plans ?? task.todos ?? task.plans ?? [];
  const dayMap = new Map();

  rawPlans.forEach((plan, planIndex) => {
    const date = plan.date ?? "";
    if (!date) return;

    if (Array.isArray(plan.tasks)) {
      dayMap.set(date, {
        id: `${makeId()}-${taskIndex}-${planIndex}`,
        date,
        open: false,
        tasks: plan.tasks.map((item, subIndex) =>
          normalizePlanTask(item, taskIndex, planIndex, subIndex)
        ),
      });
      return;
    }

    const taskItem = normalizePlanTask(plan, taskIndex, planIndex, 0);
    dayMap.set(date, {
      id: `${makeId()}-${taskIndex}-${planIndex}`,
      date,
      open: false,
      tasks:
        taskItem.title === "情報なし" && !taskItem.estimatedMinutes && !taskItem.detail
          ? []
          : [taskItem],
    });
  });

  const range = createDateRange(startDate, endDate);

  if (range.length === 0) {
    return [...dayMap.values()];
  }

  return range.map((date, index) => {
    const existing = dayMap.get(date);
    if (existing) return existing;
    return {
      id: `${makeId()}-${taskIndex}-${index}`,
      date,
      open: false,
      tasks: [],
    };
  });
}

function normalizeAiData(raw) {
  const parsed = JSON.parse(extractJsonText(raw));
  const source = parsed.longTasks ?? parsed.tasks ?? parsed.todos ?? [];

  if (!Array.isArray(source)) {
    throw new Error("longTasks / tasks / todos が配列ではありません");
  }

  return source.map((task, taskIndex) => {
    const startDate = task.startDate ?? task.start_date ?? task.from ?? "";
    const endDate = task.endDate ?? task.end_date ?? task.deadline ?? task.to ?? "";
    return {
      id: makeId() + taskIndex,
      title: task.title ?? `長期タスク${taskIndex + 1}`,
      startDate,
      endDate,
      estimatedMinutes: Number(task.estimatedMinutes ?? task.estimated_minutes ?? 0) || 0,
      open: taskIndex === 0,
      dailyPlans: normalizeDailyPlans(task, taskIndex),
    };
  });
}

function buildAiPrompt(tasks) {
  const cleanTasks = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    startDate: task.startDate,
    endDate: task.endDate,
    detail: task.detail,
  }));

  return JSON.stringify(
    {
      requestType: "create_long_task_plan",
      version: "long_task_request_v1",
      instruction:
        "以下の長期タスクを、日別の小タスクに分解してください。必ず純粋なJSONのみで返してください。",
      strictOutputRules: [
        "返答はJSONのみ。説明文、前置き、補足、Markdown、コードブロックは禁止。",
        "最初の文字は {、最後の文字は } にしてください。",
        "キー名は指定されたoutputFormatから変更しないでください。",
        "dailyPlansはstartDateからendDateまでの全日付を必ず1日1行で出力してください。",
        "1日に複数の小タスクを入れて構いません。",
        "予定を入れない日は tasks を空配列 [] にしてください。",
        "各小タスクの title は15文字以内にしてください。",
        "詳しい内容は detail に書いてください。",
        "estimatedMinutes は分単位の数値または null にしてください。",
        "各小タスクは初期状態で selected を true にしてください。",
        "JSONとしてそのままJSON.parseできる形式にしてください。",
      ],
      outputFormat: {
        version: "long_task_plan_v1",
        longTasks: [
          {
            title: "string",
            startDate: "YYYY-MM-DD",
            endDate: "YYYY-MM-DD",
            estimatedMinutes: "number",
            dailyPlans: [
              {
                date: "YYYY-MM-DD",
                tasks: [
                  {
                    title: "15文字以内のstring",
                    estimatedMinutes: "number or null",
                    detail: "string",
                    selected: "boolean",
                  },
                ],
              },
            ],
          },
        ],
      },
      userHistory: {
        include: false,
        note:
          "過去の達成タスクから、あなたの傾向をもとにした計画を立案できる可能性があります。現時点では履歴データは渡していないため、入力内容だけで無理のない計画にしてください。",
      },
      tasks: cleanTasks,
    },
    null,
    2
  );
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

function flattenSelectedPlans(task) {
  return task.dailyPlans.flatMap((day) =>
    (day.tasks ?? [])
      .filter((item) => item.selected)
      .map((item, index) => ({
        id: item.id ?? makeId() + index,
        selected: true,
        date: day.date,
        title: item.title,
        estimatedMinutes:
          item.estimatedMinutes === "" || item.estimatedMinutes == null
            ? ""
            : Number(item.estimatedMinutes),
        detail: item.detail ?? "",
        memo: item.detail ?? "",
        completed: false,
        status: "accepted",
      }))
  );
}

function StepTabs({ step, setStep }) {
  return (
    <div className="grid grid-cols-2 rounded-[18px] border border-slate-200 bg-white p-1 shadow-[0_6px_14px_rgba(15,23,42,0.035)]">
      <button
        type="button"
        onClick={() => setStep(1)}
        className={`flex h-9 items-center justify-center gap-1.5 rounded-[14px] text-[12px] font-black active:scale-[0.99] ${
          step === 1 ? "bg-emerald-500 text-white" : "text-slate-500"
        }`}
      >
        <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${step === 1 ? "bg-white text-emerald-600" : "bg-slate-100 text-slate-500"}`}>1</span>
        要望入力
      </button>

      <button
        type="button"
        onClick={() => setStep(2)}
        className={`flex h-9 items-center justify-center gap-1.5 rounded-[14px] text-[12px] font-black active:scale-[0.99] ${
          step === 2 ? "bg-emerald-500 text-white" : "text-slate-500"
        }`}
      >
        <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${step === 2 ? "bg-white text-emerald-600" : "bg-slate-100 text-slate-500"}`}>2</span>
        提案編集
      </button>
    </div>
  );
}

function Header({ onBack, step, setStep }) {
  return (
    <header className="mb-2">
      <div className="mb-2 grid h-10 grid-cols-[40px_1fr_40px] items-center">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-950 shadow-[0_4px_12px_rgba(15,23,42,0.04)] active:bg-slate-100"
        >
          <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
        </button>

        <h1 className="text-center text-[22px] font-black tracking-[-0.05em] text-slate-950">
          AI分析
        </h1>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-950 shadow-[0_4px_12px_rgba(15,23,42,0.04)] active:bg-slate-100"
        >
          <HelpCircle className="h-6 w-6" strokeWidth={2.3} />
        </button>
      </div>

      <StepTabs step={step} setStep={setStep} />
    </header>
  );
}

function AiDestinationSelector({
  destinations,
  setDestinations,
  selectedDestinationId,
  setSelectedDestinationId,
  setToast,
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const selectedDestination =
    destinations.find((item) => item.id === selectedDestinationId) ??
    destinations[0] ??
    defaultAiDestinations[0];

  const saveNewDestination = () => {
    const name = newName.trim();
    const url = normalizeUrl(newUrl);

    if (!name || !url) {
      setToast("名前とURLを入力してください");
      return;
    }

    const nextDestination = {
      id: String(makeId()),
      name,
      url,
      locked: false,
    };

    setDestinations((current) => [...current, nextDestination]);
    setSelectedDestinationId(nextDestination.id);
    setNewName("");
    setNewUrl("");
    setToast("AI遷移先を追加しました");
  };

  const deleteDestination = (id) => {
    const target = destinations.find((item) => item.id === id);
    if (!target || target.locked) return;

    setDestinations((current) => current.filter((item) => item.id !== id));

    if (selectedDestinationId === id) {
      setSelectedDestinationId("default-chatgpt");
    }

    setToast("AI遷移先を削除しました");
  };

  return (
    <section className="rounded-[18px] border border-slate-100 bg-white p-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-emerald-500" />
            <p className="text-[13px] font-black text-slate-950">AI遷移先</p>
          </div>
          <p className="mt-0.5 truncate text-[12px] font-bold text-slate-500">
            {selectedDestination.name}
          </p>
        </div>

        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
          <div className="space-y-1.5">
            {destinations.map((item) => {
              const active = item.id === selectedDestinationId;

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${
                    active ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDestinationId(item.id);
                      setToast(`${item.name}を選択しました`);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className={`truncate text-[13px] font-black ${active ? "text-emerald-700" : "text-slate-800"}`}>
                      {item.name}
                    </p>
                    <p className="truncate text-[11px] font-bold text-slate-400">{item.url}</p>
                  </button>

                  {!item.locked && (
                    <button
                      type="button"
                      onClick={() => deleteDestination(item.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-red-400 active:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl bg-slate-50 p-2.5">
            <p className="mb-1.5 text-[12px] font-black text-slate-700">URLを追加</p>

            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例）Todoプロジェクト"
              className="mb-1.5 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-[16px] font-bold text-slate-900 outline-none focus:border-emerald-400"
            />

            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="例）https://chatgpt.com/..."
              inputMode="url"
              className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-[16px] font-bold text-slate-900 outline-none focus:border-emerald-400"
            />

            <button
              type="button"
              onClick={saveNewDestination}
              className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[13px] font-black text-white active:scale-[0.985]"
            >
              <Plus className="h-4 w-4" />
              追加
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function RequestTaskCard({
  task,
  index,
  onChange,
  onDelete,
  canDelete,
  onToggleOpen,
}) {
  const endDateInputRef = useRef(null);

  const handleStartDateChange = (event) => {
    const nextStartDate = event.target.value;
    const suggestedEndDate = getNextDateKey(nextStartDate, 7);

    onChange({
      ...task,
      startDate: nextStartDate,
      endDate:
        !task.endDate || String(task.endDate) < String(nextStartDate)
          ? suggestedEndDate
          : task.endDate,
    });

    setTimeout(() => {
      endDateInputRef.current?.showPicker?.();
      endDateInputRef.current?.focus?.();
    }, 100);
  };

  const handleEndDateChange = (event) => {
    const nextEndDate = event.target.value;
    onChange({ ...task, endDate: nextEndDate });
    setTimeout(() => {
      event.target.blur();
      document.activeElement?.blur?.();
    }, 0);
  };

  return (
    <section className="rounded-[18px] border border-slate-100 bg-white p-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-[12px] font-black text-white">
            {index + 1}
          </span>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-black text-slate-700">
              {task.title.trim() || "タスク名"}
            </p>
            {!task.open && (
              <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
                {toSlashDate(task.startDate)}〜{toSlashDate(task.endDate)}
              </p>
            )}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleOpen}
            className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-100 bg-white text-slate-500 active:bg-slate-50"
          >
            <ChevronDown className={`h-5 w-5 transition-transform ${task.open ? "rotate-180" : ""}`} />
          </button>

          <button
            type="button"
            disabled={!canDelete}
            onClick={onDelete}
            className={`grid h-9 w-9 place-items-center rounded-2xl border ${
              canDelete ? "border-red-100 bg-white text-red-500 active:bg-red-50" : "border-slate-100 bg-slate-50 text-slate-200"
            }`}
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {task.open && (
        <>
          <input
            value={task.title}
            onChange={(e) => onChange({ ...task, title: e.target.value })}
            placeholder="例）学会ポスター作成"
            maxLength={50}
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-[16px] font-bold text-slate-950 outline-none focus:border-emerald-400"
          />

          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <label className="relative flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-2.5">
              <input
                type="date"
                value={task.startDate}
                onChange={handleStartDateChange}
                className="w-full bg-transparent text-[16px] font-bold text-slate-900 outline-none"
              />
            </label>

            <span className="text-[14px] font-black text-slate-500">〜</span>

            <label className="relative flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-2.5">
              <input
                ref={endDateInputRef}
                type="date"
                value={task.endDate}
                min={task.startDate}
                onChange={handleEndDateChange}
                className="w-full bg-transparent text-[16px] font-bold text-slate-900 outline-none"
              />
            </label>
          </div>

          <textarea
            value={task.detail}
            onChange={(e) => onChange({ ...task, detail: e.target.value })}
            placeholder={"例）締切、優先したいこと、忙しい日など"}
            maxLength={500}
            className="mt-2 h-[82px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[16px] font-bold leading-relaxed text-slate-800 outline-none focus:border-emerald-400"
          />
        </>
      )}
    </section>
  );
}

function IncludeHistoryToggle() {
  return (
    <div className="flex w-full items-start gap-2 rounded-[16px] border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-left opacity-70">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-transparent">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>

      <span className="min-w-0">
        <span className="block text-[12px] font-black text-slate-500 line-through">
          過去の達成履歴もAIに渡す
        </span>
        <span className="mt-0.5 block text-[11px] font-bold leading-relaxed text-slate-400">
          過去の達成タスクから、あなたの傾向をもとにした計画を立案できる可能性があります。
        </span>
      </span>
    </div>
  );
}

function RequestPage({
  requestTasks,
  setRequestTasks,
  setStep,
  setToast,
  aiDestinations,
  setAiDestinations,
  selectedAiDestinationId,
  setSelectedAiDestinationId,
}) {
  const selectedAiDestination =
    aiDestinations.find((item) => item.id === selectedAiDestinationId) ??
    aiDestinations[0] ??
    defaultAiDestinations[0];

  const addTask = () => {
    setRequestTasks((current) => [
      ...current.map((task) => ({ ...task, open: false })),
      {
        id: makeId(),
        title: "",
        startDate: formatDateKey(today),
        endDate: formatDateKey(addDays(today, 7)),
        detail: "",
        open: true,
      },
    ]);
  };

  const updateTask = (id, next) => {
    setRequestTasks((current) => current.map((task) => (task.id === id ? next : task)));
  };

  const deleteTask = (id) => {
    setRequestTasks((current) => {
      const next = current.filter((task) => task.id !== id);
      return next.length > 0 ? next : initialRequestTasks;
    });
  };

  const toggleTaskOpen = (id) => {
    setRequestTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, open: !task.open } : task))
    );
  };

  const copyAndOpen = async () => {
  const prompt = buildAiPrompt(requestTasks);
  const url = selectedAiDestination?.url || DEFAULT_AI_URL;

  const copied = await copyTextToClipboard(prompt);

  if (!copied) {
    setToast("コピーできませんでした。手動でコピーしてください");
    return;
  }

  setToast("AIへの依頼内容をコピーしました");
  setStep(2);

  setTimeout(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, 150);
};

  return (
    <main className="space-y-2.5">
      <section className="px-1">
        <h2 className="text-[18px] font-black tracking-[-0.04em] text-slate-950">
          長期タスクをAIに分解
        </h2>
        <p className="mt-0.5 text-[12px] font-bold text-slate-500">
          要望をコピーしてAIを開きます
        </p>
      </section>

      <AiDestinationSelector
        destinations={aiDestinations}
        setDestinations={setAiDestinations}
        selectedDestinationId={selectedAiDestinationId}
        setSelectedDestinationId={setSelectedAiDestinationId}
        setToast={setToast}
      />

      <section className="flex items-center justify-between px-1">
        <h3 className="text-[14px] font-black text-slate-950">依頼タスク</h3>

        <button
          type="button"
          onClick={addTask}
          className="flex h-9 items-center gap-1.5 rounded-2xl border border-emerald-100 bg-white px-3 text-[12px] font-black text-emerald-600 shadow-[0_4px_12px_rgba(15,23,42,0.035)] active:bg-emerald-50"
        >
          <Plus className="h-4 w-4" />
          追加
        </button>
      </section>

      {requestTasks.map((task, index) => (
        <RequestTaskCard
          key={task.id}
          task={task}
          index={index}
          canDelete={requestTasks.length > 1}
          onChange={(next) => updateTask(task.id, next)}
          onDelete={() => deleteTask(task.id)}
          onToggleOpen={() => toggleTaskOpen(task.id)}
        />
      ))}

      <IncludeHistoryToggle />

      <button
        type="button"
        onClick={copyAndOpen}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-emerald-600 text-[15px] font-black text-white shadow-[0_10px_22px_rgba(16,185,129,0.24)] active:scale-[0.985]"
      >
        <Sparkles className="h-5 w-5" />
        AIに提案を依頼する
      </button>

      <p className="pb-1 text-center text-[11px] font-bold text-slate-400">
        {selectedAiDestination.name}を開きます
      </p>
    </main>
  );
}

function PasteCard({ jsonText, setJsonText, onParse, parseStatus, onLoadSample }) {
  return (
    <section className="rounded-[18px] border border-slate-100 bg-white p-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-black text-slate-950">AI提案JSON</h2>
          <p className="mt-0.5 text-[11px] font-bold text-slate-500">入力欄に貼り付けて読み込み</p>
        </div>

        <button type="button" onClick={onLoadSample} className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-500 active:bg-slate-100">
          例
        </button>
      </div>

      <input
  value={jsonText}
  onChange={(e) => setJsonText(e.target.value)}
  placeholder='{"longTasks":[...]}'
  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-[16px] font-bold text-slate-800 outline-none focus:border-emerald-400"
/>

      <button type="button" onClick={() => onParse()} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-[13px] font-black text-emerald-700 active:bg-emerald-100">
        <RefreshCcw className="h-4 w-4" />
        読み込む
      </button>

      {parseStatus && (
        <div className={`mt-2 rounded-2xl px-3 py-2 text-[12px] font-bold ${parseStatus.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-500"}`}>
          {parseStatus.message}
        </div>
      )}
    </section>
  );
}

function LongTaskSummary({ task, index, active, onClick }) {
  const selectedCount = task.dailyPlans.reduce(
    (sum, day) => sum + (day.tasks ?? []).filter((item) => item.selected).length,
    0
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[16px] border bg-white px-3 py-2.5 text-left shadow-[0_6px_14px_rgba(15,23,42,0.035)] ${
        active ? "border-emerald-200 ring-2 ring-emerald-50" : "border-slate-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-[12px] font-black text-white">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black text-slate-950">{task.title}</p>
          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
            {toSlashDate(task.startDate)}〜{toSlashDate(task.endDate)} / 採用 {selectedCount}件
          </p>
        </div>

        <ChevronDown className={`h-5 w-5 text-slate-400 ${active ? "rotate-180" : ""}`} />
      </div>
    </button>
  );
}

function ShiftConfirmModal({ pending, onCancel, onConfirm }) {
  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[360px] rounded-[24px] bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-50 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-[16px] font-black text-slate-950">
            期間を延長しますか？
          </h3>
        </div>

        <p className="text-[13px] font-bold leading-relaxed text-slate-600">
          長期タスクの終了日が
          <span className="mx-1 font-black text-slate-950">{toSlashDate(pending.oldEnd)}</span>
          から
          <span className="mx-1 font-black text-emerald-600">{toSlashDate(pending.newEnd)}</span>
          に延長されます。
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-2xl border border-slate-200 bg-white text-[13px] font-black text-slate-600 active:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-2xl bg-emerald-500 text-[13px] font-black text-white active:bg-emerald-600"
          >
            延長してずらす
          </button>
        </div>
      </div>
    </div>
  );
}

function DayTaskItem({
  day,
  item,
  onChange,
  onToggle,
  onDragStart,
  dragging,
}) {
  return (
    <div
      data-plan-task-id={item.id}
      className={`rounded-2xl border border-slate-100 bg-white px-3 py-3 ${
        dragging ? "opacity-60 ring-2 ring-emerald-100" : ""
      }`}
    >
      <div className="grid grid-cols-[28px_36px_1fr_54px] items-center gap-1.5">
        <button
          type="button"
          onClick={onToggle}
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
          onPointerDown={(event) => onDragStart(event, day.date, item.id)}
          className="grid h-8 w-8 touch-none place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 active:bg-slate-100"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <input
          value={item.title}
          onChange={(e) => onChange({ ...item, title: e.target.value.slice(0, 15) })}
          placeholder="タスク名"
          maxLength={15}
          className="h-9 min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 text-[16px] font-bold text-slate-900 outline-none focus:border-emerald-400"
        />

        <input
          value={item.estimatedMinutes ?? ""}
          onChange={(e) => onChange({ ...item, estimatedMinutes: e.target.value })}
          placeholder="分"
          inputMode="numeric"
          className="h-9 rounded-xl border border-slate-200 bg-white px-1.5 text-center text-[16px] font-black text-slate-700 outline-none focus:border-emerald-400"
        />
      </div>

      <textarea
        value={item.detail ?? ""}
        onChange={(e) => onChange({ ...item, detail: e.target.value })}
        placeholder="詳細内容"
        className="mt-2 h-[72px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[16px] font-bold leading-relaxed text-slate-800 outline-none focus:border-emerald-400"
      />
    </div>
  );
}

function DayRow({
  day,
  shiftBaseDate,
  onSelectShiftBaseDate,
  onToggleDaySelected,
  onToggleOpen,
  onAddTask,
  onUpdateTask,
  onToggleTask,
  onDragStart,
  draggingTaskId,
}) {
  const selectedCount = (day.tasks ?? []).filter((item) => item.selected).length;
  const totalMinutes = (day.tasks ?? []).reduce((sum, item) => sum + (Number(item.estimatedMinutes) || 0), 0);
  const hasTasks = (day.tasks ?? []).length > 0;
  const allSelected = hasTasks && selectedCount === day.tasks.length;
  const isShiftBase = shiftBaseDate === day.date;

  return (
    <section data-day-date={day.date} className={`overflow-hidden rounded-[18px] border bg-white shadow-[0_5px_14px_rgba(15,23,42,0.035)] ${isShiftBase ? "border-emerald-300 ring-2 ring-emerald-50" : "border-slate-100"}`}>
      <div className="grid w-full grid-cols-[32px_58px_1fr_auto] items-center gap-2 px-3 py-2.5 text-left">
        <button type="button" disabled={!hasTasks} onClick={() => onToggleDaySelected(day.date)} className={`grid h-7 w-7 place-items-center rounded-xl border ${allSelected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"} ${!hasTasks ? "opacity-40" : ""}`}>
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>

        <button
  type="button"
  onClick={(event) => {
    onSelectShiftBaseDate(day.date);

    setTimeout(() => {
      event.currentTarget.blur();
      document.activeElement?.blur?.();
    }, 0);
  }}
  className={`rounded-xl px-1.5 py-1 text-left active:bg-emerald-50 ${isShiftBase ? "bg-emerald-50" : ""}`}
>
          <p className={`text-[12px] font-black leading-none ${isShiftBase ? "text-emerald-700" : "text-slate-900"}`}>
            {Number(day.date.slice(5, 7))}/{Number(day.date.slice(8, 10))}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-500">({getDayLabel(day.date)})</p>
        </button>

        <button type="button" onClick={onToggleOpen} className="min-w-0 text-left active:bg-slate-50">
          <p className={`truncate text-[13px] font-black ${hasTasks ? "text-slate-950" : "text-slate-300"}`}>
            {hasTasks ? `${day.tasks[0].title}${day.tasks.length > 1 ? ` ほか${day.tasks.length - 1}件` : ""}` : "情報なし"}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">
            採用 {selectedCount}/{day.tasks.length}件 {totalMinutes > 0 ? `・${totalMinutes}分` : ""}
          </p>
        </button>

        <button type="button" onClick={onToggleOpen} className="grid h-8 w-8 place-items-center rounded-xl active:bg-slate-50">
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${day.open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {day.open && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-2">
          {day.tasks.length === 0 ? (
            <div className="rounded-2xl bg-white px-3 py-4 text-center text-[12px] font-bold text-slate-400">情報なし</div>
          ) : (
            day.tasks.map((item) => (
              <DayTaskItem key={item.id} day={day} item={item} dragging={draggingTaskId === item.id} onChange={(next) => onUpdateTask(day.date, item.id, next)} onToggle={() => onToggleTask(day.date, item.id)} onDragStart={onDragStart} />
            ))
          )}

          <button type="button" onClick={() => onAddTask(day.date)} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-2xl border border-emerald-100 bg-white text-[12px] font-black text-emerald-600 active:bg-emerald-50">
            <Plus className="h-4 w-4" />
            この日に小タスク追加
          </button>
        </div>
      )}
    </section>
  );
}

function BulkShiftPanel({ task, onShift, shiftBaseDate, setShiftBaseDate }) {
  if (!task) return null;

  return (
    <section className="rounded-[18px] border border-slate-100 bg-white p-2.5 shadow-[0_5px_14px_rgba(15,23,42,0.035)]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-black text-slate-950">一括日程調整</p>
        <p className="text-[11px] font-bold text-slate-400">基準日以降を移動</p>
      </div>

      <div className="grid grid-cols-[1fr_repeat(4,44px)] gap-1.5">
        <input
  type="date"
  value={shiftBaseDate || task.startDate}
  min={task.startDate}
  max={task.endDate}
  onChange={(event) => {
    const value = event.target.value;
    if (!value) return;

    setShiftBaseDate(value);

    setTimeout(() => {
      event.target.blur();
      document.activeElement?.blur?.();
    }, 0);
  }}
  className="h-9 min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[16px] font-bold outline-none focus:border-emerald-400"
/>
        {[-2, -1, 1, 2].map((diff) => (
          <button
            key={diff}
            type="button"
            onClick={() => onShift(diff)}
            className="h-9 rounded-xl border border-emerald-100 bg-emerald-50 text-[12px] font-black text-emerald-700 active:bg-emerald-100"
          >
            {diff > 0 ? `+${diff}` : diff}日
          </button>
        ))}
      </div>
    </section>
  );
}

function DailyPlanEditor({ task, onChange, setToast }) {
  const [shiftBaseDate, setShiftBaseDate] = useState(task?.startDate ?? "");
  const [pendingShift, setPendingShift] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const dragInfoRef = useRef(null);

  useEffect(() => {
    setShiftBaseDate(task?.startDate ?? "");
  }, [task?.id, task?.startDate]);

  const ensureRange = (startDate, endDate, existingDays) => {
    const byDate = new Map(existingDays.map((day) => [day.date, day]));
    return createDateRange(startDate, endDate).map((date) => {
      const existing = byDate.get(date);
      return existing ?? { id: `${makeId()}-${date}`, date, open: false, tasks: [] };
    });
  };

  const applyShift = (diff, forceExtend = false) => {
    if (!task || !shiftBaseDate) return;

    const movingTasks = [];
    task.dailyPlans.forEach((day) => {
      if (day.date < shiftBaseDate) return;
      (day.tasks ?? []).forEach((item) => {
        movingTasks.push({ ...item, fromDate: day.date, toDate: addDaysToDateKey(day.date, diff) });
      });
    });

    if (movingTasks.length === 0) {
      setToast("移動対象のタスクがありません");
      return;
    }

    const minDate = movingTasks.reduce((min, item) => (item.toDate < min ? item.toDate : min), movingTasks[0].toDate);
    const maxDate = movingTasks.reduce((max, item) => (item.toDate > max ? item.toDate : max), movingTasks[0].toDate);

    if (minDate < task.startDate) {
      setToast("開始日より前には移動できません");
      return;
    }

    if (maxDate > task.endDate && !forceExtend) {
      setPendingShift({
        diff,
        oldEnd: task.endDate,
        newEnd: maxDate,
      });
      return;
    }

    const nextEndDate = maxDate > task.endDate ? maxDate : task.endDate;
    const baseDays = ensureRange(task.startDate, nextEndDate, task.dailyPlans).map((day) => ({
      ...day,
      tasks: day.date >= shiftBaseDate ? [] : [...(day.tasks ?? [])],
    }));

    const dayMap = new Map(baseDays.map((day) => [day.date, day]));

    task.dailyPlans.forEach((day) => {
      const keepOriginal = day.date < shiftBaseDate;
      if (keepOriginal) return;

      (day.tasks ?? []).forEach((item) => {
        const toDate = addDaysToDateKey(day.date, diff);
        const targetDay = dayMap.get(toDate);
        if (!targetDay) return;
        targetDay.tasks = [...(targetDay.tasks ?? []), item];
      });
    });

    onChange({
      ...task,
      endDate: nextEndDate,
      dailyPlans: [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    });

    setPendingShift(null);
  };

  const updateDay = (date, updater) => {
    onChange({
      ...task,
      dailyPlans: task.dailyPlans.map((day) =>
        day.date === date ? updater(day) : day
      ),
    });
  };

  const toggleDayOpen = (date) => {
    updateDay(date, (day) => ({ ...day, open: !day.open }));
  };

  const addTaskToDay = (date) => {
    updateDay(date, (day) => ({
      ...day,
      open: true,
      tasks: [
        ...(day.tasks ?? []),
        {
          id: makeId(),
          title: "",
          estimatedMinutes: "",
          detail: "",
          selected: true,
        },
      ],
    }));
  };

  const updateTaskItem = (date, taskId, next) => {
    updateDay(date, (day) => ({
      ...day,
      tasks: day.tasks.map((item) => (item.id === taskId ? next : item)),
    }));
  };

  const toggleTaskItem = (date, taskId) => {
    updateDay(date, (day) => ({
      ...day,
      tasks: day.tasks.map((item) =>
        item.id === taskId ? { ...item, selected: !item.selected } : item
      ),
    }));
  };

  const toggleDaySelected = (date) => {
  updateDay(date, (day) => {
    const hasTasks = (day.tasks ?? []).length > 0;
    if (!hasTasks) return day;

    const allSelected = day.tasks.every((item) => item.selected);
    return {
      ...day,
      tasks: day.tasks.map((item) => ({
        ...item,
        selected: !allSelected,
      })),
    };
  });
};

  const moveTaskToDate = (fromDate, taskId, toDate) => {
    if (!task || !toDate || fromDate === toDate) return;

    const sourceDay = task.dailyPlans.find((day) => day.date === fromDate);
    const targetDay = task.dailyPlans.find((day) => day.date === toDate);
    const moving = sourceDay?.tasks?.find((item) => item.id === taskId);

    if (!sourceDay || !targetDay || !moving) return;

    onChange({
      ...task,
      dailyPlans: task.dailyPlans.map((day) => {
        if (day.date === fromDate) {
          return {
            ...day,
            tasks: day.tasks.filter((item) => item.id !== taskId),
          };
        }
        if (day.date === toDate) {
          return {
            ...day,
            open: true,
            tasks: [...day.tasks, moving],
          };
        }
        return day;
      }),
    });
  };

  const handleDragStart = (event, fromDate, taskId) => {
    event.preventDefault();
    event.stopPropagation();

    dragInfoRef.current = {
      fromDate,
      taskId,
    };

    setDraggingTaskId(taskId);
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handlePointerUp = (event) => {
      if (!dragInfoRef.current) return;

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const dayElement = element?.closest?.("[data-day-date]");
      const toDate = dayElement?.dataset?.dayDate;

      moveTaskToDate(
        dragInfoRef.current.fromDate,
        dragInfoRef.current.taskId,
        toDate
      );

      dragInfoRef.current = null;
      setDraggingTaskId(null);
      document.body.style.touchAction = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  });

  if (!task) {
    return (
      <section className="rounded-[18px] border border-slate-100 bg-white p-5 text-center text-[12px] font-bold text-slate-400">
        AI提案を読み込むと、ここに日別予定が表示されます
      </section>
    );
  }

  return (
    <>
      <BulkShiftPanel
        task={task}
        shiftBaseDate={shiftBaseDate}
        setShiftBaseDate={setShiftBaseDate}
        onShift={(diff) => applyShift(diff, false)}
      />

      <section className="space-y-1.5">
        {task.dailyPlans.map((day) => (
          <DayRow
  key={day.date}
  day={day}
  shiftBaseDate={shiftBaseDate}
  draggingTaskId={draggingTaskId}
  onSelectShiftBaseDate={setShiftBaseDate}
  onToggleDaySelected={toggleDaySelected}
  onToggleOpen={() => toggleDayOpen(day.date)}
  onAddTask={addTaskToDay}
  onUpdateTask={updateTaskItem}
  onToggleTask={toggleTaskItem}
  onDragStart={handleDragStart}
/>
        ))}
      </section>

      <ShiftConfirmModal
        pending={pendingShift}
        onCancel={() => setPendingShift(null)}
        onConfirm={() => applyShift(pendingShift.diff, true)}
      />
    </>
  );
}

function EditPage({ aiTasks, setAiTasks, setStep, setToast, onSaveLongTasks }) {
  const [jsonText, setJsonText] = useState("");
  const [parseStatus, setParseStatus] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(aiTasks[0]?.id ?? null);

  const activeTask =
    aiTasks.find((task) => task.id === activeTaskId) ?? aiTasks[0] ?? null;

  const totalEstimated = useMemo(
    () =>
      aiTasks.reduce(
        (sum, task) =>
          sum +
          task.dailyPlans.reduce(
            (daySum, day) =>
              daySum +
              day.tasks.reduce(
                (taskSum, item) => taskSum + (Number(item.estimatedMinutes) || 0),
                0
              ),
            0
          ),
        0
      ),
    [aiTasks]
  );

  const selectedCount = useMemo(
    () =>
      aiTasks.reduce(
        (sum, task) =>
          sum +
          task.dailyPlans.reduce(
            (daySum, day) => daySum + day.tasks.filter((item) => item.selected).length,
            0
          ),
        0
      ),
    [aiTasks]
  );

  const parseJson = (overrideText) => {
  try {
    const normalized = normalizeAiData(overrideText ?? jsonText);
    setAiTasks(normalized);
    setActiveTaskId(normalized[0]?.id ?? null);
    setParseStatus({
      type: "success",
      message: "JSONを読み込みました。",
    });
  } catch (error) {
    setParseStatus({
      type: "error",
      message: `読み込み失敗：${error.message}`,
    });
  }
};

  const updateTask = (taskId, next) => {
    setAiTasks((current) => current.map((task) => (task.id === taskId ? next : task)));
  };

  const saveTasks = () => {
    const selectedTasks = aiTasks.map((task) => ({
      ...task,
      dailyPlans: flattenSelectedPlans(task),
    }));

    onSaveLongTasks?.(selectedTasks);
    setToast("長期タスクに保存しました");
  };

  return (
    <main className="space-y-2.5">
      <PasteCard
  jsonText={jsonText}
  setJsonText={setJsonText}
  parseStatus={parseStatus}
  onParse={parseJson}
  onLoadSample={() => {
    setJsonText(JSON.stringify(sampleAiJson));
    setParseStatus(null);
  }}
/>

      <section>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <h2 className="text-[15px] font-black text-slate-950">長期タスク候補</h2>
          <button
            type="button"
            onClick={() => setAiTasks((current) => current.map((task) => ({ ...task, open: false })))}
            className="text-[11px] font-black text-slate-500"
          >
            閉じる
          </button>
        </div>

        <div className="space-y-1.5">
          {aiTasks.length === 0 ? (
            <div className="rounded-[18px] border border-slate-100 bg-white p-5 text-center text-[12px] font-bold text-slate-400">
              AI提案を読み込むと表示されます
            </div>
          ) : (
            aiTasks.map((task, index) => (
              <LongTaskSummary
                key={task.id}
                task={task}
                index={index}
                active={activeTask?.id === task.id}
                onClick={() => {
                  setActiveTaskId(task.id);
                  updateTask(task.id, { ...task, open: true });
                }}
              />
            ))
          )}
        </div>
      </section>

      {aiTasks.length > 0 && (
        <section className="grid grid-cols-3 gap-1.5">
          <div className="rounded-[14px] border border-slate-100 bg-white p-2 text-center">
            <CalendarDays className="mx-auto mb-0.5 h-4 w-4 text-emerald-500" />
            <p className="text-[9px] font-black text-slate-400">タスク数</p>
            <p className="text-[14px] font-black text-slate-950">{aiTasks.length}件</p>
          </div>

          <div className="rounded-[14px] border border-slate-100 bg-white p-2 text-center">
            <Clock className="mx-auto mb-0.5 h-4 w-4 text-emerald-500" />
            <p className="text-[9px] font-black text-slate-400">推定</p>
            <p className="text-[14px] font-black text-slate-950">{shortHoursLabel(totalEstimated)}</p>
          </div>

          <div className="rounded-[14px] border border-slate-100 bg-white p-2 text-center">
            <Check className="mx-auto mb-0.5 h-4 w-4 text-emerald-500" />
            <p className="text-[9px] font-black text-slate-400">保存</p>
            <p className="text-[14px] font-black text-slate-950">{selectedCount}件</p>
          </div>
        </section>
      )}

      {activeTask?.open && (
        <DailyPlanEditor
          task={activeTask}
          setToast={setToast}
          onChange={(next) => updateTask(activeTask.id, next)}
        />
      )}

      <section className="rounded-[16px] bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
        <Check className="mr-1 inline h-3.5 w-3.5" />
        採用チェックが入った小タスクだけ保存されます。
      </section>

      <div className="grid grid-cols-2 gap-2 pb-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex h-11 items-center justify-center gap-1 rounded-[16px] border border-emerald-200 bg-white text-[12px] font-black text-emerald-700 active:bg-emerald-50"
        >
          <RefreshCcw className="h-4 w-4" />
          作り直す
        </button>

        <button
          type="button"
          onClick={saveTasks}
          className="flex h-11 items-center justify-center gap-1 rounded-[16px] bg-emerald-600 text-[13px] font-black text-white shadow-[0_10px_20px_rgba(16,185,129,0.22)] active:scale-[0.985]"
        >
          <Check className="h-4 w-4" />
          保存する
        </button>
      </div>
    </main>
  );
}

export default function AIPage({
  onBack,
  onSaveLongTasks,
  onNavigate,
}) {
  const [step, setStep] = useState(1);
  const [requestTasks, setRequestTasks] = useState(initialRequestTasks);
  const [aiTasks, setAiTasks] = useState([]);
  const [toast, setToast] = useState("");

  const [aiDestinations, setAiDestinations] = useState(() => loadAiDestinations());
  const [selectedAiDestinationId, setSelectedAiDestinationId] = useState(() =>
    loadSelectedAiDestinationId(loadAiDestinations())
  );

  useEffect(() => {
    try {
      const saveTargets = aiDestinations.filter((item) => !item.locked);
      localStorage.setItem(AI_DESTINATIONS_STORAGE_KEY, JSON.stringify(saveTargets));
    } catch {}
  }, [aiDestinations]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SELECTED_AI_DESTINATION_ID_STORAGE_KEY,
        selectedAiDestinationId
      );
    } catch {}
  }, [selectedAiDestinationId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className="min-h-[100dvh] bg-[#fbfcfb] text-slate-950 antialiased">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[480px] px-3 pb-[calc(98px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))]">
        <Header onBack={onBack} step={step} setStep={setStep} />

        {step === 1 ? (
          <RequestPage
            requestTasks={requestTasks}
            setRequestTasks={setRequestTasks}
            setStep={setStep}
            setToast={setToast}
            aiDestinations={aiDestinations}
            setAiDestinations={setAiDestinations}
            selectedAiDestinationId={selectedAiDestinationId}
            setSelectedAiDestinationId={setSelectedAiDestinationId}
          />
        ) : (
          <EditPage
            aiTasks={aiTasks}
            setAiTasks={setAiTasks}
            setStep={setStep}
            setToast={setToast}
            onSaveLongTasks={onSaveLongTasks}
          />
        )}
      </div>

      {toast && (
        <div className="fixed left-1/2 top-[calc(14px+env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full bg-slate-950 px-4 py-2 text-[13px] font-black text-white shadow-xl">
          {toast}
        </div>
      )}

      <BottomNav active="ai" onNavigate={onNavigate} />
    </div>
  );
}