import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Edit3,
  ListChecks,
  MoreHorizontal,
  Plus,
  Target,
  Trash2,
} from "lucide-react";

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

function normalizeSubTask(item, date, index) {
  return {
    id: item.id ?? `${date}-${index}-${makeId()}`,
    title: item.title ?? "",
    estimatedMinutes: item.estimatedMinutes ?? "",
    actualMinutes: item.actualMinutes ?? null,
    memo: item.memo ?? item.detail ?? "",
    detail: item.detail ?? item.memo ?? "",
    completed: Boolean(item.completed),
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
        ...plan.tasks.map((item, index) => normalizeSubTask(item, date, index)),
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
    tasks: (row.tasks ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      estimatedMinutes: item.estimatedMinutes === "" ? null : Number(item.estimatedMinutes),
      actualMinutes: item.actualMinutes ?? null,
      memo: item.memo ?? item.detail ?? "",
      detail: item.detail ?? item.memo ?? "",
      completed: Boolean(item.completed),
      selected: item.selected ?? true,
      status: item.status ?? "accepted",
    })),
  }));
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-1.5 text-center shadow-sm">
      <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-500">{icon}</div>
      <p className="text-[9px] font-black text-slate-500">{label}</p>
      <p className="mt-0.5 text-[12px] font-black text-slate-950">{value}</p>
    </div>
  );
}

export default function LongTaskDetail({
  task,
  onClose,
  onEdit,
  onDelete,
  onUpdateDailyPlan,
  onUpdateTask,
}) {
  if (!task) return null;

  const dailyRows = useMemo(() => buildDailyRows(task), [task]);
  const todayKey = dateKey(new Date());
  const todayRow = dailyRows.find((row) => row.date === todayKey) ?? dailyRows[0];
  const listScrollRef = useRef(null);

  const start = getTaskStart(task);
  const end = getTaskEnd(task);

  const focusDateKey = (() => {
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

  useEffect(() => {
    setOverviewMemo(task.overviewMemo || "");
    setExpandedId(null);
    setEditingTaskId(null);

    window.requestAnimationFrame(() => {
      const target = listScrollRef.current?.querySelector(`[data-date="${focusDateKey}"]`);
      target?.scrollIntoView({ block: "start" });
    });
  }, [task, focusDateKey]);

  const allSubTasks = dailyRows.flatMap((row) => row.tasks ?? []);
  const completedCount = allSubTasks.filter((item) => item.completed).length;
  const totalTaskCount = allSubTasks.length;
  const remainingTasks = allSubTasks.filter((item) => String(item.title ?? "").trim() && !item.completed).length;
  const totalActualMinutes = allSubTasks.reduce((sum, item) => sum + Number(item.actualMinutes || 0), 0);
  const todayPlannedMinutes = (todayRow?.tasks ?? []).reduce((sum, item) => sum + Number(item.estimatedMinutes || 0), 0);
  const progress = totalTaskCount === 0 ? 0 : Math.round((completedCount / totalTaskCount) * 100);

  const commitRows = (nextRows, changedItem = null) => {
    const serialized = serializeDailyRows(nextRows);
    onUpdateDailyPlan?.(task, changedItem, serialized);
  };

  const updateTaskItem = (rowId, taskId, updater) => {
    const nextRows = dailyRows.map((row) => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        tasks: row.tasks.map((item) => (item.id === taskId ? updater(item) : item)),
      };
    });

    const changedRow = nextRows.find((row) => row.id === rowId);
    const changedItem = changedRow?.tasks?.find((item) => item.id === taskId);
    commitRows(nextRows, changedItem);
  };

  const addSubTask = (row) => {
    const newItem = {
      id: makeId(),
      title: "",
      estimatedMinutes: "",
      actualMinutes: null,
      memo: "",
      detail: "",
      completed: false,
      selected: true,
      status: "accepted",
    };

    const nextRows = dailyRows.map((item) =>
      item.id === row.id ? { ...item, tasks: [...(item.tasks ?? []), newItem] } : item
    );

    setExpandedId(row.id);
    setEditingTaskId(newItem.id);
    setDraftTitle("");
    setDraftMinutes("");
    setDraftMemo("");
    commitRows(nextRows, newItem);
  };

  const deleteSubTask = (rowId, taskId) => {
    const nextRows = dailyRows.map((row) =>
      row.id === rowId ? { ...row, tasks: row.tasks.filter((item) => item.id !== taskId) } : row
    );

    setEditingTaskId(null);
    commitRows(nextRows);
  };

  const startEdit = (item) => {
    setEditingTaskId(item.id);
    setDraftTitle(item.title || "");
    setDraftMinutes(item.estimatedMinutes || "");
    setDraftMemo(item.memo || item.detail || "");
  };

  const saveDraft = (row, item) => {
    updateTaskItem(row.id, item.id, (current) => ({
      ...current,
      title: draftTitle,
      estimatedMinutes: draftMinutes === "" ? "" : Number(draftMinutes),
      memo: draftMemo,
      detail: draftMemo,
    }));
    setEditingTaskId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fbfcfb] text-slate-950">
      <div className="mx-auto flex h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-[#fbfcfb]">
        <header className="shrink-0 border-b border-slate-100 bg-white px-3 pt-[calc(6px+env(safe-area-inset-top))]">
          <div className="flex h-12 items-center justify-between">
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl active:bg-slate-100">
              <ChevronLeft className="h-7 w-7" />
            </button>
            <h1 className="text-[18px] font-black tracking-[-0.04em]">長期タスクの詳細</h1>
            <button type="button" className="grid h-10 w-10 place-items-center rounded-2xl active:bg-slate-100">
              <MoreHorizontal className="h-6 w-6" />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3">
          <section className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-red-500">長期タスク</div>
                <h2 className="truncate text-[19px] font-black leading-tight tracking-[-0.04em]">{task.title}</h2>
                <div className="mt-2 flex items-center gap-2 text-[12px] font-bold leading-snug text-slate-500">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span className="break-words">{formatDateLabel(start)} 〜{formatDateLabel(end)}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-start gap-2">
                <div className="pt-10 text-center">
                  <p className="text-[11px] font-black text-slate-500">進捗</p>
                  <p className="text-[24px] font-black leading-none text-emerald-600">{progress}%</p>
                </div>
                <button type="button" onClick={() => onEdit?.(task)} className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-200 text-emerald-500 active:bg-emerald-50">
                  <Edit3 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              <MiniStat icon={<CalendarDays className="h-4 w-4" />} label="残り期間" value={getRemainingDays(start, end)} />
              <MiniStat icon={<ListChecks className="h-4 w-4" />} label="残りタスク数" value={`${remainingTasks}件`} />
              <MiniStat icon={<Clock className="h-4 w-4" />} label="総作業時間" value={formatMinutes(totalActualMinutes)} />
              <MiniStat icon={<Target className="h-4 w-4" />} label="今日の予定" value={todayPlannedMinutes ? formatMinutes(todayPlannedMinutes) : "—"} />
            </div>
          </section>

          <div className="mt-3 flex rounded-t-[16px] bg-white text-[13px] font-black">
            <button type="button" onClick={() => setActiveTab("daily")} className={`h-10 flex-1 text-[13px] font-black ${activeTab === "daily" ? "border-b-2 border-emerald-500 bg-emerald-50/60 text-emerald-600" : "border-b border-slate-100 text-slate-400"}`}>
              日別の予定
            </button>
            <button type="button" onClick={() => setActiveTab("memo")} className={`h-10 flex-1 text-[13px] font-black ${activeTab === "memo" ? "border-b-2 border-emerald-500 bg-emerald-50/60 text-emerald-600" : "border-b border-slate-100 text-slate-400"}`}>
              概要・メモ
            </button>
          </div>

          {activeTab === "daily" && (
            <section ref={listScrollRef} className="max-h-[392px] overflow-y-auto rounded-b-[20px] border border-t-0 border-slate-100 bg-white">
              {dailyRows.map((row) => {
                const day = getDayLabel(row.date);
                const isSunday = day === "日";
                const isSaturday = day === "土";
                const isExpanded = expandedId === row.id;
                const tasks = row.tasks ?? [];
                const completedInDay = tasks.filter((item) => item.completed).length;
                const plannedInDay = tasks.reduce((sum, item) => sum + Number(item.estimatedMinutes || 0), 0);
                const firstTitle = tasks[0]?.title || "—";

                return (
                  <div key={row.id} data-date={row.date} className={`border-b border-slate-100 last:border-b-0 ${isExpanded ? "bg-emerald-50/20" : "bg-white"}`}>
                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : row.id)} className="grid w-full grid-cols-[48px_28px_1fr_auto] items-center gap-1 px-3 py-3 text-left">
                      <p className={`text-[12px] font-black ${isSunday ? "text-red-500" : isSaturday ? "text-blue-500" : row.date === todayKey ? "text-emerald-600" : "text-slate-700"}`}>
                        {parseDate(row.date).getMonth() + 1}/{parseDate(row.date).getDate()}（{day}）
                      </p>

                      <div className={`grid h-6 w-6 place-items-center rounded-full border ${completedInDay > 0 || row.date === todayKey ? "border-emerald-500 text-emerald-500" : "border-slate-300 text-slate-300"}`}>
                        {tasks.length > 0 && completedInDay === tasks.length ? <CheckCircle2 className="h-5 w-5" /> : row.date === todayKey ? <div className="h-4 w-4 rounded-full bg-emerald-500" /> : null}
                      </div>

                      <div className="min-w-0">
                        <p className={`truncate text-[13px] font-black ${tasks.length > 0 ? "text-slate-950" : "text-slate-300"}`}>
                          {firstTitle}{tasks.length > 1 ? ` ほか${tasks.length - 1}件` : ""}
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
                          <div className="rounded-2xl bg-emerald-50/40 p-3 text-center text-[12px] font-bold text-slate-400">この日の小タスクはありません</div>
                        ) : (
                          tasks.map((item) => {
                            const isEditing = editingTaskId === item.id;

                            return (
                              <div key={item.id} className="rounded-2xl bg-emerald-50/40 p-3">
                                {isEditing ? (
                                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="タスク名" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[16px] font-medium placeholder:text-slate-300 outline-none focus:border-emerald-400" />
                                      <div className="flex shrink-0 items-center">
                                        <input value={draftMinutes === "" ? "" : Number(draftMinutes) / 60} onChange={(e) => setDraftMinutes(Number(e.target.value || 0) * 60)} inputMode="numeric" className="h-10 w-[58px] rounded-xl border border-slate-200 bg-white px-2 text-center text-[16px] font-black outline-none focus:border-emerald-400" />
                                        <span className="ml-1.5 text-[11px] font-black text-slate-500">時間</span>
                                      </div>
                                    </div>

                                    <textarea value={draftMemo} onChange={(e) => setDraftMemo(e.target.value)} placeholder="タスクの詳細内容" rows={3} className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[16px] font-medium placeholder:text-slate-300 outline-none focus:border-emerald-400" />

                                    <div className="mt-3 flex justify-end gap-2">
                                      <button type="button" onClick={() => setEditingTaskId(null)} className="h-10 w-[88px] rounded-xl border border-slate-200 bg-white text-[13px] font-black text-slate-700 active:bg-slate-50">キャンセル</button>
                                      <button type="button" onClick={() => saveDraft(row, item)} className="h-10 w-[88px] rounded-xl bg-emerald-500 text-[13px] font-black text-white active:bg-emerald-600">保存</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-start gap-2">
                                      <button type="button" onClick={() => updateTaskItem(row.id, item.id, (current) => ({ ...current, completed: !current.completed }))} className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${item.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}>
                                        <CheckCircle2 className="h-5 w-5" />
                                      </button>

                                      <div className="min-w-0 flex-1">
                                        <p className={`text-[13px] font-black ${item.completed ? "text-slate-400 line-through" : "text-slate-950"}`}>{item.title || "タスク名なし"}</p>
                                        <p className="mt-0.5 text-[11px] font-bold text-slate-400">{item.estimatedMinutes ? `予定 ${formatMinutes(item.estimatedMinutes)}` : "予定時間なし"}</p>
                                      </div>

                                      <button type="button" onClick={() => startEdit(item)} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-emerald-300 bg-white text-emerald-600">
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </button>

                                      <button type="button" onClick={() => deleteSubTask(row.id, item.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-red-100 bg-white text-red-400">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>

                                    <div className="mt-2 min-h-[58px] rounded-xl bg-white/60 px-3 py-2.5 text-[13px] font-medium leading-relaxed text-slate-700">
                                      {item.memo || item.detail ? <p>{item.memo || item.detail}</p> : <p className="text-slate-400">詳細はまだありません</p>}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })
                        )}

                        <button type="button" onClick={() => addSubTask(row)} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-2xl border border-emerald-100 bg-white text-[12px] font-black text-emerald-600 active:bg-emerald-50">
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
            <section className="rounded-b-[20px] border border-t-0 border-slate-100 bg-white p-3">
              <textarea value={overviewMemo} onChange={(e) => { const value = e.target.value; setOverviewMemo(value); onUpdateTask?.({ ...task, overviewMemo: value }); }} placeholder="長期タスク全体のメモ" rows={10} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[16px] font-medium outline-none placeholder:text-slate-300 focus:border-emerald-400" />
            </section>
          )}

          {deleteConfirmOpen ? (
            <div className="mt-2 rounded-2xl border border-red-100 bg-red-50 p-3">
              <p className="text-center text-[12px] font-bold text-red-500">この長期タスクを削除しますか？</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="h-10 rounded-xl border border-slate-200 bg-white text-[13px] font-black text-slate-600 active:bg-slate-50">キャンセル</button>
                <button type="button" onClick={() => onDelete?.(task)} className="h-10 rounded-xl bg-red-500 text-[13px] font-black text-white active:bg-red-600">削除する</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setDeleteConfirmOpen(true)} className="mt-1 h-10 w-full rounded-2xl text-[12px] font-black text-red-400 active:bg-red-50">
              この長期タスクを削除
            </button>
          )}
        </main>
      </div>
    </div>
  );
}