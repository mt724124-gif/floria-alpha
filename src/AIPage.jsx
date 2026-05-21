import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clipboard,
  Clock,
  Copy,
  GripVertical,
  HelpCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const PROJECT_URL = "https://chatgpt.com/";

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

const initialRequestTasks = [
  {
    id: 1,
    title: "学会ポスター作成",
    startDate: formatDateKey(today),
    endDate: formatDateKey(addDays(today, 39)),
    detail:
      "・6/20締切の学会ポスターを作成したい\n・共同演者の確認が必要\n・図表を先に作ってから、考察を書きたい\n・5月後半は少し忙しくなりそう",
  },
];

const sampleAiJson = {
  version: "long_task_plan_v1",
  longTasks: [
    {
      title: "学会ポスター作成",
      startDate: "2026-05-12",
      endDate: "2026-06-20",
      estimatedMinutes: 1080,
      dailyPlans: [
        {
          date: "2026-05-12",
          title: "ポスターの全体構成を考える",
          estimatedMinutes: 120,
          status: "accepted",
        },
        {
          date: "2026-05-13",
          title: "図表の候補を集める・整理する",
          estimatedMinutes: 150,
          status: "accepted",
        },
        {
          date: "2026-05-14",
          title: "結果の図表を作成する",
          estimatedMinutes: null,
          status: "pending",
        },
        {
          date: "2026-05-15",
          title: "考察のアウトラインを作る",
          estimatedMinutes: null,
          status: "pending",
        },
        {
          date: "2026-05-18",
          title: "ポスターのレイアウトを作成",
          estimatedMinutes: null,
          status: "pending",
        },
      ],
    },
    {
      title: "文献紹介スライド作成",
      startDate: "2026-05-18",
      endDate: "2026-06-05",
      estimatedMinutes: 360,
      dailyPlans: [
        {
          date: "2026-05-18",
          title: "論文全体を読み直す",
          estimatedMinutes: 60,
          status: "accepted",
        },
        {
          date: "2026-05-19",
          title: "背景・目的スライドを作る",
          estimatedMinutes: 90,
          status: "pending",
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
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function minutesLabel(minutes) {
  if (minutes == null || minutes === "" || Number(minutes) <= 0) return "未設定";
  const h = Math.floor(Number(minutes) / 60);
  const m = Number(minutes) % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function shortHoursLabel(minutes) {
  if (minutes == null || minutes === "" || Number(minutes) <= 0) return "未設定";
  const h = Number(minutes) / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

function makeId() {
  return Date.now() + Math.floor(Math.random() * 10000);
}

function normalizeAiData(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const source = parsed.longTasks ?? parsed.tasks ?? parsed.todos ?? [];

  if (!Array.isArray(source)) {
    throw new Error("longTasks / tasks / todos が配列ではありません");
  }

  return source.map((task, taskIndex) => ({
    id: makeId() + taskIndex,
    title: task.title ?? `長期タスク${taskIndex + 1}`,
    startDate: task.startDate ?? task.start_date ?? task.from ?? "",
    endDate: task.endDate ?? task.end_date ?? task.deadline ?? task.to ?? "",
    estimatedMinutes: Number(task.estimatedMinutes ?? task.estimated_minutes ?? 0) || 0,
    open: taskIndex === 0,
    dailyPlans: (task.dailyPlans ?? task.daily_plans ?? task.todos ?? task.plans ?? []).map(
      (plan, planIndex) => ({
        id: makeId() + taskIndex * 100 + planIndex,
        selected:
  plan.selected !== undefined
    ? plan.selected
    : plan.status === "accepted",
        date: plan.date ?? "",
        title: plan.title ?? plan.content ?? "",
        estimatedMinutes:
          plan.estimatedMinutes ?? plan.estimated_minutes ?? plan.minutes ?? "",
        status: plan.status ?? "pending",
      })
    ),
  }));
}

function buildAiPrompt(tasks) {
  return JSON.stringify(
    {
      requestType: "create_long_task_plan",
      version: "long_task_request_v1",
      instruction:
        "以下の長期タスクを、日別の予定に分解してください。必ずJSONのみで返してください。",
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
                title: "string",
                estimatedMinutes: "number or null",
                status: "accepted or pending",
              },
            ],
          },
        ],
      },
      tasks,
    },
    null,
    2
  );
}

function StepTabs({ step, setStep }) {
  return (
    <div className="grid grid-cols-2 rounded-[22px] border border-slate-200 bg-white p-1 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={() => setStep(1)}
        className={`flex h-11 items-center justify-center gap-2 rounded-[18px] text-[14px] font-black active:scale-[0.99] ${
          step === 1
            ? "bg-emerald-500 text-white shadow-[0_10px_18px_rgba(16,185,129,0.24)]"
            : "text-slate-500"
        }`}
      >
        <span className={`grid h-6 w-6 place-items-center rounded-full ${step === 1 ? "bg-white text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
          1
        </span>
        要望を入力
      </button>

      <button
        type="button"
        onClick={() => setStep(2)}
        className={`flex h-11 items-center justify-center gap-2 rounded-[18px] text-[14px] font-black active:scale-[0.99] ${
          step === 2
            ? "bg-emerald-500 text-white shadow-[0_10px_18px_rgba(16,185,129,0.24)]"
            : "text-slate-500"
        }`}
      >
        <span className={`grid h-6 w-6 place-items-center rounded-full ${step === 2 ? "bg-white text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
          2
        </span>
        提案を編集
      </button>
    </div>
  );
}

function Header({ onBack, step, setStep }) {
  return (
    <header className="mb-3">
      <div className="mb-3 grid h-12 grid-cols-[44px_1fr_44px] items-center">
        <button
          type="button"
          onClick={onBack}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-950 shadow-[0_6px_16px_rgba(15,23,42,0.05)] active:bg-slate-100"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} />
        </button>

        <h1 className="text-center text-[25px] font-black tracking-[-0.05em] text-slate-950">
          AI分析
        </h1>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-950 shadow-[0_6px_16px_rgba(15,23,42,0.05)] active:bg-slate-100"
        >
          <HelpCircle className="h-7 w-7" strokeWidth={2.3} />
        </button>
      </div>

      <StepTabs step={step} setStep={setStep} />
    </header>
  );
}

function RequestTaskCard({ task, index, onChange, onDelete, canDelete }) {
  return (
    <section className="rounded-[22px] border border-slate-100 bg-white p-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.055)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-[14px] font-black text-white">
            {index + 1}
          </span>
          <p className="text-[13px] font-black text-slate-600">タスクのタイトル（必須）</p>
        </div>

        <button
          type="button"
          disabled={!canDelete}
          onClick={onDelete}
          className={`grid h-10 w-10 place-items-center rounded-2xl border ${
            canDelete
              ? "border-red-100 bg-white text-red-500 active:bg-red-50"
              : "border-slate-100 bg-slate-50 text-slate-200"
          }`}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <input
        value={task.title}
        onChange={(e) => onChange({ ...task, title: e.target.value })}
        placeholder="例）学会ポスター作成"
        maxLength={50}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[16px] font-bold text-slate-950 outline-none focus:border-emerald-400"
      />
      <p className="mt-1 text-right text-[12px] font-bold text-slate-400">
        {task.title.length}/50
      </p>

      <p className="mb-2 mt-2 text-[13px] font-black text-slate-600">期間（必須）</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <label className="relative flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-3">
          <input
            type="date"
            value={task.startDate}
            onChange={(e) => onChange({ ...task, startDate: e.target.value })}
            className="w-full bg-transparent text-[14px] font-bold text-slate-900 outline-none"
          />
          <CalendarDays className="h-5 w-5 text-emerald-500" />
        </label>

        <span className="text-[18px] font-black text-slate-500">〜</span>

        <label className="relative flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-3">
          <input
            type="date"
            value={task.endDate}
            onChange={(e) => onChange({ ...task, endDate: e.target.value })}
            className="w-full bg-transparent text-[14px] font-bold text-slate-900 outline-none"
          />
          <CalendarDays className="h-5 w-5 text-emerald-500" />
        </label>
      </div>

      <p className="mb-2 mt-3 text-[13px] font-black text-slate-600">
        AIに相談したい内容（任意・自由記述）
      </p>
      <textarea
        value={task.detail}
        onChange={(e) => onChange({ ...task, detail: e.target.value })}
        placeholder={"例）\n・締切までに完成させたい\n・先に図表を作りたい\n・忙しい時期がある"}
        maxLength={500}
        className="h-[132px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold leading-relaxed text-slate-800 outline-none focus:border-emerald-400"
      />
      <p className="mt-1 text-right text-[12px] font-bold text-slate-400">
        {task.detail.length}/500
      </p>
    </section>
  );
}

function RequestPage({ requestTasks, setRequestTasks, setStep, setToast }) {
  const addTask = () => {
    setRequestTasks((current) => [
      ...current,
      {
        id: makeId(),
        title: "",
        startDate: formatDateKey(today),
        endDate: formatDateKey(addDays(today, 14)),
        detail: "",
      },
    ]);
  };

  const updateTask = (id, next) => {
    setRequestTasks((current) => current.map((task) => (task.id === id ? next : task)));
  };

  const deleteTask = (id) => {
    setRequestTasks((current) => current.filter((task) => task.id !== id));
  };

  const copyAndOpen = async () => {
    const prompt = buildAiPrompt(requestTasks);
    try {
      await navigator.clipboard.writeText(prompt);
      setToast("AIへの依頼内容をコピーしました");
    } catch {
      setToast("コピーできませんでした。手動でコピーしてください");
    }

    window.open(PROJECT_URL, "_blank");
    setStep(2);
  };

  return (
    <main className="space-y-3">
      <section className="px-1">
        <h2 className="text-[21px] font-black tracking-[-0.04em] text-slate-950">
          AIに長期タスクの要望を伝えましょう
        </h2>
        <p className="mt-1 text-[13px] font-bold text-slate-500">
          複数のタスクをまとめて依頼できます
        </p>
      </section>

      <section className="flex items-center justify-between px-1">
        <h3 className="text-[16px] font-black text-slate-950">依頼する長期タスク</h3>
        <button
          type="button"
          onClick={addTask}
          className="flex h-10 items-center gap-1.5 rounded-2xl border border-emerald-100 bg-white px-3 text-[13px] font-black text-emerald-600 shadow-[0_6px_16px_rgba(15,23,42,0.04)] active:bg-emerald-50"
        >
          <Plus className="h-5 w-5" />
          タスクを追加
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
        />
      ))}

      <section className="rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-4 py-3">
        <p className="text-[13px] font-black text-emerald-800">💡 書き方のポイント</p>
        <p className="mt-1 text-[12px] font-bold leading-relaxed text-slate-600">
          目的・締切・優先したいこと・忙しい時期を書いておくと、日別予定が作りやすくなります。
        </p>
      </section>

      <button
        type="button"
        onClick={copyAndOpen}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-emerald-600 text-[16px] font-black text-white shadow-[0_14px_28px_rgba(16,185,129,0.28)] active:scale-[0.985]"
      >
        <Sparkles className="h-5 w-5" />
        AIに提案を依頼する（次へ）
      </button>

      <p className="pb-2 text-center text-[12px] font-bold text-slate-400">
        入力した内容はAIに送信されます
      </p>
    </main>
  );
}

function PasteCard({ jsonText, setJsonText, onParse, parseStatus, onLoadSample }) {
  return (
    <section className="rounded-[22px] border border-slate-100 bg-white p-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.055)]">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-black text-slate-950">AIからの提案</h2>
          <p className="mt-0.5 text-[12px] font-bold text-slate-500">
            AIから返ってきた内容を貼り付けてください
          </p>
        </div>
        <button
          type="button"
          onClick={onLoadSample}
          className="rounded-full bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-500 active:bg-slate-100"
        >
          例を入力
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder='例）{"longTasks":[...]}'
          className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-800 outline-none focus:border-emerald-400"
        />

        <button
          type="button"
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              setJsonText(text);
            } catch {}
          }}
          className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border border-emerald-100 bg-white px-3 text-[13px] font-black text-emerald-600 active:bg-emerald-50"
        >
          <Clipboard className="h-4 w-4" />
          貼り付け
        </button>
      </div>

      <button
        type="button"
        onClick={onParse}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-[14px] font-black text-emerald-700 active:bg-emerald-100"
      >
        <RefreshCcw className="h-4 w-4" />
        読み込む
      </button>

      {parseStatus && (
        <div
          className={`mt-3 rounded-2xl px-4 py-3 text-[13px] font-bold ${
            parseStatus.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-500"
          }`}
        >
          {parseStatus.message}
        </div>
      )}
    </section>
  );
}

function LongTaskSummary({ task, index, active, onClick, onToggleOpen }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[18px] border bg-white px-3.5 py-3 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)] ${
        active ? "border-emerald-200 ring-2 ring-emerald-50" : "border-slate-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-[14px] font-black text-white">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black text-slate-950">{task.title}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">
            期間：{toSlashDate(task.startDate)}〜{toSlashDate(task.endDate)}
            {task.startDate && task.endDate ? `（${daysBetween(task.startDate, task.endDate)}日間）` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleOpen();
          }}
          className="grid h-8 w-8 place-items-center rounded-xl text-slate-700 active:bg-slate-100"
        >
          <ChevronDown className={`h-5 w-5 transition-transform ${task.open ? "rotate-180" : ""}`} />
        </button>
      </div>
    </button>
  );
}

function PlanRow({ plan, onChange, onDelete }) {
  return (
    <div className="grid grid-cols-[26px_44px_1fr_58px_76px_30px] items-center gap-2 border-b border-slate-100 bg-white px-2 py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={() => onChange({ ...plan, selected: !plan.selected })}
        className={`grid h-6 w-6 place-items-center rounded-lg border ${
          plan.selected
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </button>

      <div className="text-center">
        <p className="text-[12px] font-black leading-none text-slate-900">
          {plan.date ? `${Number(plan.date.slice(5, 7))}/${Number(plan.date.slice(8, 10))}` : "日付"}
        </p>
        <p className="mt-1 text-[10px] font-bold text-slate-500">
          {plan.date ? `(${getDayLabel(plan.date)})` : ""}
        </p>
      </div>

      <input
        value={plan.title}
        onChange={(e) => onChange({ ...plan, title: e.target.value })}
        className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-bold text-slate-900 outline-none focus:border-emerald-400"
      />

      <input
        value={plan.estimatedMinutes ?? ""}
        onChange={(e) => onChange({ ...plan, estimatedMinutes: e.target.value })}
        placeholder="未"
        inputMode="numeric"
        className="h-9 rounded-full border border-slate-200 bg-slate-50 px-2 text-center text-[11px] font-black text-slate-700 outline-none focus:border-emerald-400"
      />

      <select
        value={plan.status}
        onChange={(e) => onChange({ ...plan, status: e.target.value })}
        className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 outline-none focus:border-emerald-400"
      >
        <option value="accepted">採用</option>
        <option value="pending">未設定</option>
        <option value="skip">保留</option>
      </select>

      <button
        type="button"
        onClick={onDelete}
        className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 active:bg-red-50 active:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DailyPlanEditor({ task, onChange }) {
  if (!task) {
    return (
      <section className="rounded-[22px] border border-slate-100 bg-white p-6 text-center text-[13px] font-bold text-slate-400">
        AI提案を読み込むと、ここに日別予定が表示されます
      </section>
    );
  }

  const addPlan = () => {
    onChange({
      ...task,
      dailyPlans: [
        ...task.dailyPlans,
        {
          id: makeId(),
          selected: true,
          date: task.startDate || formatDateKey(today),
          title: "",
          estimatedMinutes: "",
          status: "pending",
        },
      ],
    });
  };

  const updatePlan = (planId, next) => {
    onChange({
      ...task,
      dailyPlans: task.dailyPlans.map((plan) => (plan.id === planId ? next : plan)),
    });
  };

  const deletePlan = (planId) => {
    onChange({
      ...task,
      dailyPlans: task.dailyPlans.filter((plan) => plan.id !== planId),
    });
  };

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.055)]">
      <div className="grid grid-cols-2 border-b border-slate-100">
        <button className="h-11 border-b-2 border-emerald-500 text-[13px] font-black text-emerald-600">
          {task.title}
        </button>
        <button className="h-11 text-[13px] font-black text-slate-400">
          概要・メモ
        </button>
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-[14px] font-black text-slate-950">日別の予定</h3>
        <button
          type="button"
          onClick={addPlan}
          className="flex h-9 items-center gap-1 rounded-2xl border border-emerald-100 bg-white px-3 text-[12px] font-black text-emerald-600 active:bg-emerald-50"
        >
          <Plus className="h-4 w-4" />
          日を追加
        </button>
      </div>

      <div className="grid grid-cols-[26px_44px_1fr_58px_76px_30px] gap-2 border-y border-slate-100 bg-slate-50 px-2 py-2 text-center text-[10px] font-black text-slate-500">
        <span />
        <span>日付</span>
        <span>予定内容</span>
        <span>分</span>
        <span>状態</span>
        <span />
      </div>

      <div>
        {task.dailyPlans.map((plan) => (
          <PlanRow
            key={plan.id}
            plan={plan}
            onChange={(next) => updatePlan(plan.id, next)}
            onDelete={() => deletePlan(plan.id)}
          />
        ))}
      </div>

      <div className="bg-white px-4 py-3 text-center text-[12px] font-black text-slate-500">
        残りの日程もAIが提案しています
      </div>
    </section>
  );
}

function EditPage({ aiTasks, setAiTasks, setStep, setToast, onSaveLongTasks }) {
  const [jsonText, setJsonText] = useState("");
  const [parseStatus, setParseStatus] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(aiTasks[0]?.id ?? null);

  const activeTask = aiTasks.find((task) => task.id === activeTaskId) ?? aiTasks[0] ?? null;

  const totalEstimated = useMemo(
    () => aiTasks.reduce((sum, task) => sum + (Number(task.estimatedMinutes) || 0), 0),
    [aiTasks]
  );

  const parseJson = () => {
    try {
      const normalized = normalizeAiData(jsonText);
      setAiTasks(normalized);
      setActiveTaskId(normalized[0]?.id ?? null);
      setParseStatus({ type: "success", message: "JSONを読み込みました。内容を確認して編集できます。" });
    } catch (error) {
      setParseStatus({
        type: "error",
        message: `読み込みに失敗しました：${error.message}`,
      });
    }
  };

  const updateTask = (taskId, next) => {
    setAiTasks((current) => current.map((task) => (task.id === taskId ? next : task)));
  };

  const saveTasks = () => {
    const selectedTasks = aiTasks.map((task) => ({
      ...task,
      dailyPlans: task.dailyPlans.filter((plan) => plan.selected),
    }));

    onSaveLongTasks?.(selectedTasks);
    setToast("長期タスクに保存しました");
  };

  return (
    <main className="space-y-3">
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
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[17px] font-black text-slate-950">提案された長期タスク</h2>
          <button className="text-[12px] font-black text-slate-500">すべて閉じる</button>
        </div>

        <div className="space-y-2">
          {aiTasks.length === 0 ? (
            <div className="rounded-[22px] border border-slate-100 bg-white p-6 text-center text-[13px] font-bold text-slate-400">
              AIからの提案を読み込むと、長期タスク候補が表示されます
            </div>
          ) : (
            aiTasks.map((task, index) => (
              <LongTaskSummary
                key={task.id}
                task={task}
                index={index}
                active={activeTask?.id === task.id}
                onClick={() => setActiveTaskId(task.id)}
                onToggleOpen={() => updateTask(task.id, { ...task, open: !task.open })}
              />
            ))
          )}
        </div>
      </section>

      {aiTasks.length > 0 && (
        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-[16px] border border-slate-100 bg-white p-3 text-center shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
            <CalendarDays className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
            <p className="text-[10px] font-black text-slate-400">タスク数</p>
            <p className="text-[17px] font-black text-slate-950">{aiTasks.length}件</p>
          </div>
          <div className="rounded-[16px] border border-slate-100 bg-white p-3 text-center shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
            <Clock className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
            <p className="text-[10px] font-black text-slate-400">推定時間</p>
            <p className="text-[17px] font-black text-slate-950">{shortHoursLabel(totalEstimated)}</p>
          </div>
          <div className="rounded-[16px] border border-slate-100 bg-white p-3 text-center shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
            <Check className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
            <p className="text-[10px] font-black text-slate-400">保存対象</p>
            <p className="text-[17px] font-black text-slate-950">
              {aiTasks.reduce((sum, task) => sum + task.dailyPlans.filter((p) => p.selected).length, 0)}件
            </p>
          </div>
        </section>
      )}

      <DailyPlanEditor
        task={activeTask}
        onChange={(next) => updateTask(activeTask.id, next)}
      />

      <section className="rounded-[18px] bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-800">
        <Check className="mr-1 inline h-4 w-4" />
        選択した日程が長期タスクに追加されます。後で変更できます。
      </section>

      <div className="grid grid-cols-2 gap-2 pb-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex h-13 items-center justify-center gap-2 rounded-[18px] border border-emerald-200 bg-white text-[13px] font-black text-emerald-700 active:bg-emerald-50"
        >
          <RefreshCcw className="h-5 w-5" />
          もう一度AIに作り直してもらう
        </button>

        <button
          type="button"
          onClick={saveTasks}
          className="flex h-13 items-center justify-center gap-2 rounded-[18px] bg-emerald-600 text-[14px] font-black text-white shadow-[0_12px_24px_rgba(16,185,129,0.25)] active:scale-[0.985]"
        >
          <Check className="h-5 w-5" />
          長期タスクに保存する
        </button>
      </div>
    </main>
  );
}

export default function AIPage({
  onBack,
  onSaveLongTasks,
}) {
  const [step, setStep] = useState(1);
  const [requestTasks, setRequestTasks] = useState(initialRequestTasks);
  const [aiTasks, setAiTasks] = useState([]);
  const [toast, setToast] = useState("");

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className="min-h-[100dvh] bg-[#fbfcfb] text-slate-950 antialiased">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[480px] px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))]">
        <Header onBack={onBack} step={step} setStep={setStep} />

        {step === 1 ? (
          <RequestPage
            requestTasks={requestTasks}
            setRequestTasks={setRequestTasks}
            setStep={setStep}
            setToast={setToast}
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
    </div>
  );
}