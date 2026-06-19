import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  CircleDot,
  Clock3,
  Target,
} from "lucide-react";
import BottomNav from "./components/BottomNav";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

const TREND_MODES = {
  focus: {
    label: "集中時間",
    title: "日別の集中時間",
    icon: Clock3,
    valueKey: "focusMinutes",
    colorClass: "bg-emerald-500",
    maxMode: "auto",
    valueLabel: (value) => formatMinutes(value),
  },
  completed: {
    label: "完了数",
    title: "日別の完了数",
    icon: CheckCircle2,
    valueKey: "completedTaskCount",
    colorClass: "bg-blue-500",
    maxMode: "auto",
    valueLabel: (value) => `${value}件`,
  },
  achievement: {
    label: "達成率",
    title: "日別の達成率",
    icon: BarChart3,
    valueKey: "achievementRate",
    colorClass: "bg-violet-500",
    maxMode: "percent",
    valueLabel: (value) => `${value}%`,
  },
};

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, diffDays) {
  const next = new Date(date);
  next.setDate(next.getDate() + diffDays);
  return next;
}

function getStartOfWeek(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(Number(minutes ?? 0)));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) return `${mins}分`;
  if (mins === 0) return `${hours}時間`;
  return `${hours}時間${mins}分`;
}

function formatCompactMinutes(minutes) {
  const total = Math.max(0, Math.round(Number(minutes ?? 0)));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
}

function formatShortDate(dateKey) {
  const date = parseDateKey(dateKey);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function isLongPlanTaskVisible(task) {
  return (
    task?.selected !== false &&
    task?.reviewOnly !== true &&
    task?.taskStatus !== "deleted" &&
    String(task?.title ?? "").trim()
  );
}

function isCompleted(task) {
  return task?.taskStatus === "completed" || task?.completed === true;
}

function getTaskActualMinutes(task) {
  const actualSeconds = Number(task?.actualSeconds ?? task?.elapsedSeconds ?? 0);
  if (actualSeconds > 0) return Math.round(actualSeconds / 60);

  return Math.max(
    0,
    Number(
      task?.actualMinutes ??
        task?.workedMinutes ??
        task?.focusMinutes ??
        task?.elapsedMinutes ??
        0
    )
  );
}

function getTaskDateKey(task) {
  return task?.targetDate ?? task?.date ?? task?.createdDate ?? getDateKey();
}

function isShortTaskVisible(task) {
  return (
    task?.type !== "longDailyReview" &&
    task?.type !== "longDailyEmpty" &&
    task?.type !== "longDaily" &&
    task?.taskStatus !== "deleted" &&
    String(task?.title ?? "").trim()
  );
}

function getWeekDays(baseDate = new Date()) {
  const start = getStartOfWeek(baseDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      dateKey: getDateKey(date),
      weekday: WEEKDAYS[index],
    };
  });
}

function getNiceMaxValue(value, minimum) {
  const maxValue = Math.max(0, Number(value ?? 0));
  if (maxValue <= 0) return minimum;

  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  const normalized = maxValue / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return Math.max(minimum, niceNormalized * magnitude);
}

function getFocusMaxValue(value) {
  const maxValue = Math.max(0, Number(value ?? 0));
  if (maxValue <= 0) return 60;
  return (Math.floor(maxValue / 60) + 1) * 60;
}

function getLongTaskStart(longTask) {
  const planDates = (longTask?.dailyPlans ?? [])
    .map((plan) => plan.date)
    .filter(Boolean)
    .sort();
  return longTask?.startDate ?? longTask?.start ?? planDates[0] ?? "";
}

function getLongTaskEnd(longTask) {
  const planDates = (longTask?.dailyPlans ?? [])
    .map((plan) => plan.date)
    .filter(Boolean)
    .sort();
  return longTask?.endDate ?? longTask?.end ?? planDates[planDates.length - 1] ?? "";
}

function overlapsWeek(longTask, weekStartKey, weekEndKey) {
  const start = getLongTaskStart(longTask);
  const end = getLongTaskEnd(longTask);
  if (!start || !end) return false;
  return start <= weekEndKey && end >= weekStartKey;
}

function buildWeekStats(appData = {}, baseDate = new Date()) {
  const weekDays = getWeekDays(baseDate);
  const dailyRecords = appData.dailyRecords ?? {};

  const days = weekDays.map((day) => {
    const record = dailyRecords[day.dateKey] ?? {};
    const shortTasks = (appData.tasks ?? []).filter(
      (task) => getTaskDateKey(task) === day.dateKey && isShortTaskVisible(task)
    );
    const longTasks = (appData.longTasks ?? []).flatMap((longTask) =>
      (longTask.dailyPlans ?? [])
        .filter((plan) => plan.date === day.dateKey)
        .flatMap((plan) => (Array.isArray(plan.tasks) ? plan.tasks : []))
        .filter(isLongPlanTaskVisible)
    );
    const allTasks = [...shortTasks, ...longTasks];
    const taskCreatedCount = allTasks.length;
    const taskCompletedCount = allTasks.filter(isCompleted).length;
    const taskFocusMinutes = allTasks.reduce(
      (sum, task) => sum + getTaskActualMinutes(task),
      0
    );
    const createdTaskCount = Math.max(
      Number(record.createdTaskCount ?? 0),
      taskCreatedCount
    );
    const completedTaskCount = Math.max(
      Number(record.completedTaskCount ?? 0),
      taskCompletedCount
    );
    const focusMinutes = Math.max(
      Number(record.totalActualMinutes ?? 0),
      taskFocusMinutes
    );
    const achievementRate =
      createdTaskCount === 0
        ? 0
        : Math.round((completedTaskCount / createdTaskCount) * 100);

    return {
      ...day,
      focusMinutes,
      completedTaskCount,
      createdTaskCount,
      achievementRate: Math.min(100, Math.max(0, achievementRate)),
    };
  });

  const totalFocusMinutes = days.reduce((sum, day) => sum + day.focusMinutes, 0);
  const totalCompletedTasks = days.reduce(
    (sum, day) => sum + day.completedTaskCount,
    0
  );
  const totalCreatedTasks = days.reduce(
    (sum, day) => sum + day.createdTaskCount,
    0
  );
  const weeklyAchievementRate =
    totalCreatedTasks === 0
      ? 0
      : Math.round((totalCompletedTasks / totalCreatedTasks) * 100);

  return {
    days,
    totalFocusMinutes,
    totalCompletedTasks,
    totalCreatedTasks,
    weeklyAchievementRate,
  };
}

function buildLongTaskProgress(appData = {}, weekDays = []) {
  const weekDateKeys = new Set(weekDays.map((day) => day.dateKey));
  const weekStartKey = weekDays[0]?.dateKey ?? "";
  const weekEndKey = weekDays[weekDays.length - 1]?.dateKey ?? "";
  const tasks = (appData.longTasks ?? [])
    .filter((longTask) => overlapsWeek(longTask, weekStartKey, weekEndKey))
    .map((longTask) => {
      const allSubTasks = (longTask.dailyPlans ?? [])
        .flatMap((plan) =>
          (Array.isArray(plan.tasks) ? plan.tasks : []).map((task) => ({
            ...task,
            planDate: plan.date,
          }))
        )
        .filter(isLongPlanTaskVisible);

      const weekSubTasks = allSubTasks.filter((task) => weekDateKeys.has(task.planDate));
      const totalCount = allSubTasks.length;
      const totalCompleted = allSubTasks.filter(isCompleted).length;
      const progress = totalCount === 0 ? 0 : Math.round((totalCompleted / totalCount) * 100);
      const weekCompleted = weekSubTasks.filter(isCompleted).length;
      const weekMinutes = weekSubTasks.reduce(
        (sum, task) => sum + getTaskActualMinutes(task),
        0
      );

      return {
        id: longTask.id,
        title: longTask.title ?? "名称なしの長期タスク",
        color: longTask.color ?? "bg-emerald-500",
        deadline: getLongTaskEnd(longTask),
        totalCount,
        totalCompleted,
        progress,
        weekCompleted,
        weekMinutes,
      };
    })
    .filter(
      (task) =>
        task.totalCount > 0 ||
        task.weekCompleted > 0 ||
        task.weekMinutes > 0
    )
    .sort((a, b) => b.weekCompleted - a.weekCompleted || b.weekMinutes - a.weekMinutes);

  const weeklyCompletedCount = tasks.reduce((sum, task) => sum + task.weekCompleted, 0);
  const weeklyMinutes = tasks.reduce((sum, task) => sum + task.weekMinutes, 0);
  const averageProgress =
    tasks.length === 0
      ? 0
      : Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);

  return {
    tasks,
    weeklyCompletedCount,
    weeklyMinutes,
    averageProgress,
  };
}

function Header() {
  return (
    <header className="mb-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-black text-slate-950">週間まとめ</h1>
        </div>
      </div>
    </header>
  );
}

function SummaryCard({ stats }) {
  return (
    <section className="rounded-[22px] border border-emerald-100 bg-white px-2.5 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-3 divide-x divide-slate-100">
        <SummaryItem icon={Clock3} label="集中時間" value={formatMinutes(stats.totalFocusMinutes)} />
        <SummaryItem icon={CheckCircle2} label="完了数" value={`${stats.totalCompletedTasks}件`} />
        <SummaryItem icon={CircleDot} label="達成率" value={`${stats.weeklyAchievementRate}%`} />
      </div>
    </section>
  );
}

function SummaryItem({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 px-1.5">
      <div className="mb-1 flex items-center gap-1.5 text-emerald-600">
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
        <span className="truncate text-[10px] font-black text-slate-500">{label}</span>
      </div>
      <p className="truncate whitespace-nowrap text-[14px] font-black text-slate-950 min-[390px]:text-[16px]">
        {value}
      </p>
    </div>
  );
}

function TrendCard({ days, mode, setMode, rangeLabel, isThisWeek, onCurrentWeek }) {
  const activeMode = TREND_MODES[mode] ?? TREND_MODES.focus;
  const Icon = activeMode.icon;
  const values = days.map((day) => Number(day[activeMode.valueKey] ?? 0));
  const rawMax = Math.max(0, ...values);
  const barValueLabel =
    mode === "focus" ? formatCompactMinutes : activeMode.valueLabel;
  const maxValue =
    activeMode.maxMode === "percent"
      ? 100
      : mode === "focus"
        ? getFocusMaxValue(rawMax)
        : getNiceMaxValue(rawMax, 3);
  const bestIndex = rawMax > 0 ? values.findIndex((value) => value === rawMax) : -1;

  return (
    <section className="rounded-[20px] border border-slate-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-emerald-500" strokeWidth={2.4} />
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-black text-slate-950">
          {activeMode.title}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <span className="whitespace-nowrap rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-500">
            {rangeLabel}
          </span>
          {!isThisWeek && (
            <button
              type="button"
              onClick={onCurrentWeek}
              className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-600 active:scale-[0.97]"
            >
              今週に戻る
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-slate-50 p-1">
        {Object.entries(TREND_MODES).map(([key, item]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`h-8 rounded-xl text-[12px] font-black ${
              mode === key ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[30px_1fr] gap-2">
        <div className="flex h-[142px] flex-col justify-between pb-6 pt-1 text-right text-[9px] font-black text-slate-300">
          <span>{activeMode.valueLabel(maxValue)}</span>
          <span>{activeMode.valueLabel(Math.round(maxValue / 2))}</span>
          <span>0</span>
        </div>

        <div>
          <div className="relative flex h-[142px] items-end gap-1.5 border-b border-slate-100 px-1">
            <div className="pointer-events-none absolute inset-x-1 top-1/2 border-t border-dashed border-slate-100" />
            {days.map((day, index) => {
              const value = Number(day[activeMode.valueKey] ?? 0);
              const height = value <= 0 ? 3 : Math.max(10, (value / maxValue) * 100);

              return (
                <div
                  key={day.dateKey}
                  className="relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  {bestIndex === index && (
                    <span className="absolute -top-4 text-[14px] leading-none" aria-label="ベストデイ">
                      🏆
                    </span>
                  )}
                  <div className="whitespace-nowrap text-[8px] font-black leading-none text-slate-500 min-[390px]:text-[9px]">
                    {barValueLabel(value)}
                  </div>
                  <div className="flex h-[104px] w-full max-w-[22px] items-end rounded-t-xl bg-slate-50">
                    <div
                      className={`w-full rounded-t-xl ${activeMode.colorClass}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center">
            {days.map((day) => (
              <div key={day.dateKey} className="min-w-0">
                <p className="text-[10px] font-black text-slate-500">{day.weekday}</p>
                <p className="text-[9px] font-bold text-slate-300">{formatShortDate(day.dateKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WeekTrendPager({ appData, baseDate, setBaseDate }) {
  const scrollRef = useRef(null);
  const pendingCenterScrollRef = useRef(true);
  const [mode, setMode] = useState("focus");
  const baseWeek = useMemo(() => getStartOfWeek(baseDate), [baseDate]);
  const thisWeekKey = getDateKey(getStartOfWeek(new Date()));
  const weeks = useMemo(() => {
    return [-1, 0, 1].map((offset) => addDays(baseWeek, offset * 7));
  }, [baseWeek]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pendingCenterScrollRef.current) return;
    requestAnimationFrame(() => {
      el.scrollLeft = el.clientWidth;
      pendingCenterScrollRef.current = false;
    });
  }, [weeks]);

  const handleScrollEnd = () => {
    const el = scrollRef.current;
    if (!el) return;

    const rawIndex = Math.round(el.scrollLeft / el.clientWidth);
    const index = Math.min(2, Math.max(0, rawIndex));
    const offset = index - 1;
    const nextWeek = addDays(baseWeek, offset * 7);
    if (!nextWeek) return;

    if (offset !== 0) {
      pendingCenterScrollRef.current = true;
      setBaseDate(nextWeek);
      return;
    }

    if (rawIndex !== 1) {
      el.scrollTo({ left: el.clientWidth, behavior: "smooth" });
    }
  };

  return (
    <div
      ref={scrollRef}
      onScrollEnd={handleScrollEnd}
      className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-[20px] scrollbar-none touch-pan-x"
    >
      {weeks.map((weekDate) => {
        const weekStats = buildWeekStats(appData, weekDate);
        const rangeLabel = `${formatShortDate(weekStats.days[0].dateKey)} - ${formatShortDate(
          weekStats.days[6].dateKey
        )}`;
        const weekKey = getDateKey(getStartOfWeek(weekDate));
        return (
          <div key={getDateKey(weekDate)} className="w-full shrink-0 snap-start snap-always">
            <TrendCard
              days={weekStats.days}
              mode={mode}
              setMode={setMode}
              rangeLabel={rangeLabel}
              isThisWeek={weekKey === thisWeekKey}
              onCurrentWeek={() => {
                pendingCenterScrollRef.current = true;
                setBaseDate(new Date());
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2 py-2.5 text-center">
      <p className="text-[10px] font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-[13px] font-black text-slate-950">{value}</p>
    </div>
  );
}

function LongTaskProgressCard({ progress }) {
  const tasks = progress.tasks ?? [];

  return (
    <section className="rounded-[20px] border border-slate-100 bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-5 w-5 text-emerald-500" strokeWidth={2.4} />
        <h2 className="text-[15px] font-black text-slate-950">長期タスクの進捗</h2>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <MiniStat label="今週完了数" value={`${progress.weeklyCompletedCount}件`} />
        <MiniStat label="今週投入時間" value={formatMinutes(progress.weeklyMinutes)} />
        <MiniStat label="平均進捗率" value={`${progress.averageProgress}%`} />
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-[13px] font-bold text-slate-400">
          今週表示できる長期タスクはありません
        </p>
      ) : (
        <div className="space-y-2.5">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} className="min-w-0 rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
              <div className="mb-1.5 flex items-start gap-2">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${task.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black text-slate-900">{task.title}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                    期限：{task.deadline ? `${formatShortDate(task.deadline)}まで` : "未設定"}
                  </p>
                </div>
                <span className="text-[14px] font-black text-emerald-600">{task.progress}%</span>
              </div>

              <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              <div className="flex items-center gap-3 text-[11px] font-black text-slate-500">
                <span>✓ {task.weekCompleted}件完了</span>
                <span>⏱ {formatMinutes(task.weekMinutes)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function StatsPage({ appData, onNavigate }) {
  const [baseDate, setBaseDate] = useState(() => new Date());
  const stats = useMemo(() => buildWeekStats(appData, baseDate), [appData, baseDate]);
  const longTaskProgress = useMemo(
    () => buildLongTaskProgress(appData, stats.days),
    [appData, stats.days]
  );

  return (
    <div className="min-h-dvh bg-[#f6f8f7] text-slate-950 antialiased">
      <div
        className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#fbfcfb] px-[max(12px,env(safe-area-inset-left))] pb-[calc(94px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] shadow-[0_0_80px_rgba(15,23,42,0.045)]"
      >
        <Header />

        <main className="space-y-3">
          <SummaryCard stats={stats} />
          <WeekTrendPager appData={appData} baseDate={baseDate} setBaseDate={setBaseDate} />
          <LongTaskProgressCard progress={longTaskProgress} />
        </main>
      </div>

      <BottomNav active="stats" onNavigate={onNavigate} />
    </div>
  );
}
