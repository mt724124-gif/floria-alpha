import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock, Edit3, ListChecks, MoreHorizontal, Plus, Target} from "lucide-react";

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

function getRemainingDays(end) {
  const today = new Date();
  const endDate = parseDate(end);

  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  return Math.max(0, Math.ceil((endDate - today) / 86400000));
}

function buildDailyRows(task) {
  if (task.dailyPlans?.length) return task.dailyPlans;

  const rows = [];

  for (
    let d = parseDate(task.start);
    d <= parseDate(task.end);
    d.setDate(d.getDate() + 1)
  ) {
    const key = dateKey(d);

    rows.push({
      id: `${task.id}-${key}`,
      date: key,
      title: "",
      completed: false,
      estimatedMinutes: "",
      actualMinutes: null,
      memo: "",
    });
  }

  return rows;
}

export default function LongTaskDetail({
  task,
  onClose,
  onEdit,
  onDelete,
  onAddTodayPlan,
  onUpdateDailyPlan,
}) {
  if (!task) return null;

  const initialRows = useMemo(() => buildDailyRows(task), [task]);

const [dailyRows, setDailyRows] = useState(initialRows);

const todayKey = dateKey(new Date());

const todayRow =
  dailyRows.find((row) => row.date === todayKey) ?? dailyRows[0];

const [expandedId, setExpandedId] = useState(todayRow?.id ?? null);

const [editingId, setEditingId] = useState(null);

const [draftTitle, setDraftTitle] = useState(
  todayRow?.title || ""
);

const [draftMinutes, setDraftMinutes] = useState(
  todayRow?.estimatedMinutes || ""
);

const [draftMemo, setDraftMemo] = useState(
  todayRow?.memo || ""
);

useEffect(() => {
  const nextRows = buildDailyRows(task);

  setDailyRows(nextRows);

  const nextTodayRow =
    nextRows.find((row) => row.date === dateKey(new Date())) ?? nextRows[0];

  setExpandedId(nextTodayRow?.id ?? null);
  setEditingId(null);
}, [task]);

  const completedRows = dailyRows.filter((row) => row.completed).length;

  const remainingTasks = dailyRows.filter(
    (row) => !row.completed
  ).length;

  const totalActualMinutes = dailyRows.reduce(
    (sum, row) => sum + Number(row.actualMinutes || 0),
    0
  );

  const todayPlannedMinutes = Number(
    todayRow?.estimatedMinutes || draftMinutes || 0
  );

  const progress =
    dailyRows.length === 0
      ? 0
      : Math.round((completedRows / dailyRows.length) * 100);

  const saveDraft = (row) => {
    const updatedRow = {
      ...row,
      title: draftTitle,
      estimatedMinutes:
  draftMinutes === ""
    ? null
    : Number(draftMinutes),
      memo: draftMemo,
    };

    const nextRows = dailyRows.map((item) =>
      item.id === row.id ? updatedRow : item
    );

    setDailyRows(nextRows);

    setEditingId(null);

    onUpdateDailyPlan?.(task, updatedRow, nextRows);
  };

  const startEdit = (row) => {
    setEditingId(row.id);

    setDraftTitle(row.title || "");

    setDraftMinutes(row.estimatedMinutes || "");

    setDraftMemo(row.memo || "");
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

                <div className="mb-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-red-500">
                  長期タスク
                </div>

                <h2 className="truncate text-[19px] font-black leading-tight tracking-[-0.04em]">
                  {task.title}
                </h2>

                <div className="mt-2 flex items-center gap-2 text-[12px] font-bold leading-snug text-slate-500">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span className="break-words">
                    {formatDateLabel(task.start)} 〜{formatDateLabel(task.end)}
                  </span>
                </div>

              </div>

              <div className="flex shrink-0 items-start gap-2">

                <div className="pt-10 text-center">
                  <p className="text-[11px] font-black text-slate-500">
                    進捗
                  </p>

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
                value={`${getRemainingDays(task.end)}日`}
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
                value={formatMinutes(todayPlannedMinutes)}
              />

            </div>

          </section>

          <div className="mt-3 flex rounded-t-[16px] bg-white text-[13px] font-black">

            <button className="h-10 flex-1 border-b-2 border-emerald-500 bg-emerald-50/60 text-emerald-600">
              日別の予定
            </button>

            <button className="h-10 flex-1 border-b border-slate-100 text-slate-400">
              概要・メモ
            </button>

          </div>

          <section className="overflow-hidden rounded-b-[20px] border border-t-0 border-slate-100 bg-white">

            {dailyRows.map((row) => {

              const day = getDayLabel(row.date);

              const isSunday = day === "日";

              const isSaturday = day === "土";

              const isEditing = editingId === row.id;

              const isExpanded = expandedId === row.id;

              return (
                <div
                  key={row.id}
                  className={`border-b border-slate-100 last:border-b-0 ${
                    isExpanded ? "bg-emerald-50/20" : "bg-white"
                  }`}
                >

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(
                        expandedId === row.id ? null : row.id
                      )
                    }
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
                      {parseDate(row.date).getMonth() + 1}/
                      {parseDate(row.date).getDate()}（{day}）
                    </p>

                    <div
                      className={`grid h-6 w-6 place-items-center rounded-full border ${
                        row.completed || row.date === todayKey
                          ? "border-emerald-500 text-emerald-500"
                          : "border-slate-300 text-slate-300"
                      }`}
                    >
                      {row.completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : row.date === todayKey ? (
                        <div className="h-4 w-4 rounded-full bg-emerald-500" />
                      ) : null}
                    </div>

                    <p
                      className={`truncate text-[13px] font-black ${
                        row.title
                          ? "text-slate-950"
                          : "text-slate-300"
                      }`}
                    >
                      {row.title || "—"}
                    </p>

                    <div className="text-[11px] font-black text-slate-400">
                      {row.actualMinutes ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-600">
                          実績 {formatMinutes(row.actualMinutes)}
                        </span>
                      ) : (
                        <span>
  {row.estimatedMinutes
    ? `予定 ${formatMinutes(row.estimatedMinutes)}`
    : "未設定"}
</span>
                      )}
                    </div>

                  </button>

                  {isExpanded && (

                    <div className="px-3 pb-3">

                      {isEditing ? (

                        <div className="rounded-2xl bg-white p-3 shadow-sm">

                          <div className="flex items-center gap-2">

  <input
  value={draftTitle}
  onChange={(e) =>
    setDraftTitle(e.target.value)
  }
  placeholder="タスク名"
  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[16px] font-medium placeholder:text-slate-300 outline-none focus:border-emerald-400"
/>

  <div className="flex shrink-0 items-center">
    <input
      value={
  draftMinutes === ""
    ? ""
    : draftMinutes / 60
}
      onChange={(e) =>
        setDraftMinutes(
          Number(e.target.value || 0) * 60
        )
      }
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
  onChange={(e) =>
    setDraftMemo(e.target.value)
  }
  placeholder="タスクの詳細内容"
  rows={3}
  className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[16px] font-medium placeholder:text-slate-300 outline-none focus:border-emerald-400"
/>

                          <div className="mt-3 flex justify-end gap-2">

                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="h-10 w-[88px] rounded-xl border border-slate-200 bg-white text-[13px] font-black text-slate-700 active:bg-slate-50"
                            >
                              キャンセル
                            </button>

                            <button
                              type="button"
                              onClick={() => saveDraft(row)}
                              className="h-10 w-[88px] rounded-xl bg-emerald-500 text-[13px] font-black text-white active:bg-emerald-600"
                            >
                              保存
                            </button>

                          </div>

                        </div>

                      ) : (

                        <div className="rounded-2xl bg-emerald-50/40 p-3">

                          <div className="mt-3 flex items-end gap-2">
  <div className="min-h-[84px] flex-1 rounded-xl bg-white/60 px-3 py-2.5 text-[13px] font-medium leading-relaxed text-slate-700">
    {row.memo ? (
      <p>{row.memo}</p>
    ) : (
      <p className="text-slate-400">詳細はまだありません</p>
    )}
  </div>

  <button
    type="button"
    onClick={() => startEdit(row)}
    className="ml-auto flex h-8 w-[76px] shrink-0 items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-white text-[11px] font-black text-emerald-600"
  >
    <Edit3 className="h-3.5 w-3.5" />
    編集
  </button>
</div>

                        </div>

                      )}

                    </div>

                  )}

                </div>
              );
            })}

          </section>

          <button
            type="button"
            onClick={() => onAddTodayPlan?.(task)}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white text-[14px] font-black text-emerald-600 active:bg-emerald-50"
          >
            <Plus className="h-5 w-5" />
            今日の予定を追加
          </button>

          <p className="mt-3 text-center text-[11px] font-bold text-slate-400">
            ※ 長期タスク全体の期間はカレンダーから変更できます
          </p>

          <button
            type="button"
            onClick={() => onDelete?.(task)}
            className="mt-1 h-10 w-full rounded-2xl text-[12px] font-black text-red-400 active:bg-red-50"
          >
            この長期タスクを削除
          </button>

        </main>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-1.5 text-center shadow-sm">

      <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-500">
        {icon}
      </div>

      <p className="text-[9px] font-black text-slate-500">
        {label}
      </p>

      <p className="mt-0.5 text-[12px] font-black text-slate-950">
        {value}
      </p>

    </div>
  );
}