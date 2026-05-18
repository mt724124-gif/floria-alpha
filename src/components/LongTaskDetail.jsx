import { CalendarDays, CheckCircle2, ChevronLeft, Clock, Edit3, MoreHorizontal, Plus, Target, Timer } from "lucide-react";

function formatDateLabel(dateText) {
  const date = new Date(dateText);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function getDayLabel(dateText) {
  const date = new Date(dateText);
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
}

function getDaysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.round((endDate - startDate) / 86400000);
  return Math.max(1, diff + 1);
}

function getRemainingDays(end) {
  const today = new Date();
  const endDate = new Date(end);
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((endDate - today) / 86400000));
}

function buildDailyRows(task) {
  if (task.dailyPlans?.length) return task.dailyPlans;

  const start = new Date(task.start);
  const end = new Date(task.end);
  const rows = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split("T")[0];
    rows.push({
      id: `${task.id}-${key}`,
      date: key,
      title: "",
      completed: false,
      estimatedMinutes: null,
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
}) {
  if (!task) return null;

  const dailyRows = buildDailyRows(task);
  const totalDays = getDaysBetween(task.start, task.end);
  const remainingDays = getRemainingDays(task.end);
  const completedRows = dailyRows.filter((row) => row.completed).length;
  const progress = dailyRows.length === 0 ? 0 : Math.round((completedRows / dailyRows.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-[#fbfcfb] text-slate-950">
      <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[#fbfcfb]">
        <header className="shrink-0 border-b border-slate-100 bg-white px-4 pt-[calc(8px+env(safe-area-inset-top))]">
          <div className="flex h-14 items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-2xl text-slate-950 active:bg-slate-100"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>

            <h1 className="text-[17px] font-black tracking-[-0.03em]">
              長期タスクの詳細
            </h1>

            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-2xl text-slate-950 active:bg-slate-100"
            >
              <MoreHorizontal className="h-6 w-6" />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4">
          <section className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="mb-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-black text-emerald-600">
              長期タスク
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[22px] font-black leading-tight tracking-[-0.04em]">
                  {task.title}
                </h2>

                <div className="mt-3 flex items-center gap-2 text-[13px] font-bold text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    {formatDateLabel(task.start)} 〜 {formatDateLabel(task.end)}
                  </span>
                </div>
              </div>

              <div className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-2 text-center">
                <p className="text-[11px] font-black text-slate-500">進捗</p>
                <p className="text-[18px] font-black text-emerald-600">{progress}%</p>
              </div>
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <MiniStat icon={<CalendarDays className="h-4 w-4" />} label="残り期間" value={`${remainingDays}日`} />
              <MiniStat icon={<CheckCircle2 className="h-4 w-4" />} label="完了" value={`${completedRows}件`} />
              <MiniStat icon={<Clock className="h-4 w-4" />} label="期間" value={`${totalDays}日`} />
              <MiniStat icon={<Target className="h-4 w-4" />} label="今日" value="—" />
            </div>
          </section>

          <div className="mt-4 flex rounded-[18px] bg-white p-1 text-[13px] font-black shadow-sm ring-1 ring-slate-100">
            <button className="h-10 flex-1 rounded-[14px] bg-emerald-50 text-emerald-600">
              日別の予定
            </button>
            <button className="h-10 flex-1 rounded-[14px] text-slate-400">
              概要・メモ
            </button>
          </div>

          <section className="mt-3 overflow-hidden rounded-[22px] border border-slate-100 bg-white">
            {dailyRows.map((row) => {
              const day = getDayLabel(row.date);
              const isSunday = day === "日";
              const isSaturday = day === "土";

              return (
                <div key={row.id} className="border-b border-slate-100 last:border-b-0">
                  <div className="grid grid-cols-[70px_34px_1fr_auto] items-center gap-2 px-4 py-3">
                    <p className={`text-[13px] font-black ${isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-slate-700"}`}>
                      {new Date(row.date).getMonth() + 1}/{new Date(row.date).getDate()}（{day}）
                    </p>

                    <div className="grid h-6 w-6 place-items-center rounded-full border border-slate-300 text-emerald-500">
                      {row.completed && <CheckCircle2 className="h-5 w-5" />}
                    </div>

                    <div className="min-w-0">
                      <p className={`truncate text-[14px] font-black ${row.title ? "text-slate-950" : "text-slate-300"}`}>
                        {row.title || "—"}
                      </p>
                      {row.memo && (
                        <p className="mt-1 truncate text-[11px] font-bold text-slate-400">
                          {row.memo}
                        </p>
                      )}
                    </div>

                    <button className="grid h-8 w-8 place-items-center rounded-full text-slate-400 active:bg-slate-100">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>

                  {dateKey(new Date(row.date)) === dateKey(new Date()) && (
                    <div className="mx-4 mb-3 rounded-[18px] bg-emerald-50 p-3">
                      <p className="mb-2 text-[12px] font-black text-emerald-600">今日の詳細</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit?.(task)}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white text-[13px] font-black text-emerald-600"
                        >
                          <Edit3 className="h-4 w-4" />
                          編集する
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddTodayPlan?.(task)}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-[13px] font-black text-white"
                        >
                          <Timer className="h-4 w-4" />
                          15分だけやる
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <button
            type="button"
            onClick={() => onAddTodayPlan?.(task)}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white text-[15px] font-black text-emerald-600"
          >
            <Plus className="h-5 w-5" />
            今日の予定を追加
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(task)}
            className="mt-3 h-11 w-full rounded-2xl text-[13px] font-black text-red-400 active:bg-red-50"
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
    <div className="rounded-2xl border border-slate-100 bg-white p-2 text-center shadow-sm">
      <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-emerald-500">
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-[15px] font-black text-slate-950">{value}</p>
    </div>
  );
}