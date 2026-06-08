import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Medal,
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
    valueLabel: (value) => (value > 0 ? formatMinutes(value) : "0分"),
  },
  completed: {
    label: "完了数",
    title: "日別の完了数",
    icon: CheckCircle2,
    valueKey: "completedTaskCount",
    colorClass: "bg-blue-500",
    valueLabel: (value) => `${value}件`,
  },
  achievement: {
    label: "達成率",
    title: "日別の達成率",
    icon: BarChart3,
    valueKey: "achievementRate",
    colorClass: "bg-violet-500",
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
  const total = Math.max(0, Number(minutes ?? 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) return `${mins}分`;
  if (mins === 0) return `${hours}時間`;
  return `${hours}時間${mins}分`;
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

function buildWeekStats(appData = {}, baseDate = new Date()) {
  const weekDays = getWeekDays(baseDate);
  const dailyRecords = appData.dailyRecords ?? {};

  const days = weekDays.map((day) => {
    const record = dailyRecords[day.dateKey] ?? {};
    const createdTaskCount = Number(record.createdTaskCount ?? 0);
    const completedTaskCount = Number(record.completedTaskCount ?? 0);
    const focusMinutes = Number(record.totalActualMinutes ?? 0);
    const achievementRate =
      createdTaskCount === 0
        ? 0
        : Number(
            record.achievementRate ??
              Math.round((completedTaskCount / createdTaskCount) * 100)
          );

    return {
      ...day,
      focusMinutes,
      completedTaskCount,
      createdTaskCount,
      achievementRate,
    };
  });

  const totalFocusMinutes = days.reduce(
    (sum, day) => sum + day.focusMinutes,
    0
  );
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

  const bestDay = [...days].sort((a, b) => {
    if (b.focusMinutes !== a.focusMinutes) return b.focusMinutes - a.focusMinutes;
    if (b.completedTaskCount !== a.completedTaskCount) {
      return b.completedTaskCount - a.completedTaskCount;
    }
    return b.achievementRate - a.achievementRate;
  })[0];

  return {
    days,
    totalFocusMinutes,
    totalCompletedTasks,
    totalCreatedTasks,
    weeklyAchievementRate,
    bestDay,
  };
}

function buildLongTaskProgress(appData = {}, weekDays = []) {
  const weekDateKeys = new Set(weekDays.map((day) => day.dateKey));

  return (appData.longTasks ?? [])
    .map((longTask) => {
      const weekTasks = (longTask.dailyPlans ?? [])
        .filter((plan) => weekDateKeys.has(plan.date))
        .flatMap((plan) => (Array.isArray(plan.tasks) ? plan.tasks : []))
        .filter(isLongPlanTaskVisible);

      const total = weekTasks.length;
      const completed = weekTasks.filter(isCompleted).length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        id: longTask.id,
        title: longTask.title ?? "無題の長期タスク",
        color: longTask.color ?? "bg-emerald-500",
        total,
        completed,
        progress,
      };
    })
    .filter((task) => task.total > 0)
    .sort((a, b) => b.progress - a.progress || b.total - a.total);
}

function Header({ rangeLabel, onPreviousWeek, onNextWeek }) {
  return (
    <header className="mb-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-black text-emerald-600">今週のまとめ</p>
          <h1 className="text-[24px] font-black text-slate-950">週間まとめ</h1>
        </div>
      </div>

      <div className="grid grid-cols-[40px_1fr_40px] items-center gap-2 rounded-2xl bg-white p-1.5 text-[12px] font-black text-slate-500 shadow-sm">
        <button
          type="button"
          onClick={onPreviousWeek}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 active:bg-slate-100"
          aria-label="前週"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <div className="flex min-w-0 items-center justify-center gap-1.5">
          <CalendarDays className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.4} />
          <span className="truncate">{rangeLabel}</span>
        </div>

        <button
          type="button"
          onClick={onNextWeek}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 active:bg-slate-100"
          aria-label="翌週"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}

function SummaryCard({ stats }) {
  return (
    <section className="rounded-[22px] border border-emerald-100 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-3 divide-x divide-slate-100">
        <SummaryItem
          icon={Clock3}
          label="集中時間"
          value={formatMinutes(stats.totalFocusMinutes)}
        />
        <SummaryItem
          icon={CheckCircle2}
          label="完了数"
          value={`${stats.totalCompletedTasks}件`}
        />
        <SummaryItem
          icon={CircleDot}
          label="達成率"
          value={`${stats.weeklyAchievementRate}%`}
        />
      </div>
    </section>
  );
}

function SummaryItem({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 px-2">
      <div className="mb-1 flex items-center gap-1.5 text-emerald-600">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2.4} />
        <span className="truncate text-[11px] font-black text-slate-500">
          {label}
        </span>
      </div>
      <p className="truncate text-[18px] font-black text-slate-950 min-[390px]:text-[20px]">
        {value}
      </p>
    </div>
  );
}

function TrendCard({ days }) {
  const [mode, setMode] = useState("focus");
  const activeMode = TREND_MODES[mode] ?? TREND_MODES.focus;
  const Icon = activeMode.icon;
  const maxValue = Math.max(
    1,
    ...days.map((day) => Number(day[activeMode.valueKey] ?? 0))
  );

  return (
    <section className="rounded-[20px] border border-slate-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-emerald-500" strokeWidth={2.4} />
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-black text-slate-950">
          {activeMode.title}
        </h2>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-slate-50 p-1">
        {Object.entries(TREND_MODES).map(([key, item]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`h-8 rounded-xl text-[12px] font-black ${
              mode === key
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-400"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex h-[118px] items-end gap-2 border-b border-slate-100 px-1">
        {days.map((day) => {
          const value = Number(day[activeMode.valueKey] ?? 0);
          const height = value === 0 ? 3 : Math.max(8, (value / maxValue) * 100);

          return (
            <div
              key={day.dateKey}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <div className="text-[10px] font-black text-slate-400">
                {activeMode.valueLabel(value)}
              </div>
              <div
                className={`w-full max-w-[18px] rounded-t-lg ${activeMode.colorClass}`}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {days.map((day) => (
          <div key={day.dateKey} className="min-w-0">
            <p className="text-[10px] font-black text-slate-500">{day.weekday}</p>
            <p className="text-[9px] font-bold text-slate-300">
              {formatShortDate(day.dateKey)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BestDayCard({ bestDay }) {
  const hasActivity =
    bestDay?.focusMinutes > 0 ||
    bestDay?.completedTaskCount > 0 ||
    bestDay?.achievementRate > 0;

  return (
    <section className="rounded-[20px] border border-amber-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-50 text-amber-500">
          <Medal className="h-5 w-5" strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-[12px] font-black text-amber-600">ベストデイ</p>
          <h2 className="text-[17px] font-black text-slate-950">
            {bestDay
              ? `${formatShortDate(bestDay.dateKey)}（${bestDay.weekday}）`
              : "まだありません"}
          </h2>
        </div>
      </div>

      {hasActivity ? (
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="集中" value={formatMinutes(bestDay.focusMinutes)} />
          <MiniStat label="完了" value={`${bestDay.completedTaskCount}件`} />
          <MiniStat label="達成率" value={`${bestDay.achievementRate}%`} />
        </div>
      ) : (
        <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-[13px] font-bold text-slate-400">
          この週の記録はまだありません
        </p>
      )}
    </section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2 py-3 text-center">
      <p className="text-[10px] font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-[13px] font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function LongTaskProgressCard({ tasks }) {
  return (
    <section className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-5 w-5 text-emerald-500" strokeWidth={2.4} />
        <h2 className="text-[15px] font-black text-slate-950">長期タスク進捗</h2>
        <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600">
          {tasks.length}件
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-3 py-5 text-center text-[13px] font-bold text-slate-400">
          この週に予定されている長期タスクはありません
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.color}`} />
                <p className="min-w-0 flex-1 truncate text-[13px] font-black text-slate-800">
                  {task.title}
                </p>
                <span className="text-[11px] font-black text-slate-400">
                  {task.completed}/{task.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${task.progress}%` }}
                />
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
  const stats = buildWeekStats(appData, baseDate);
  const longTaskProgress = buildLongTaskProgress(appData, stats.days);
  const rangeLabel = `${formatShortDate(stats.days[0].dateKey)} - ${formatShortDate(
    stats.days[6].dateKey
  )}`;

  return (
    <div className="min-h-dvh bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#fbfcfb] px-[max(12px,env(safe-area-inset-left))] pb-[calc(94px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <Header
          rangeLabel={rangeLabel}
          onPreviousWeek={() => setBaseDate((current) => addDays(current, -7))}
          onNextWeek={() => setBaseDate((current) => addDays(current, 7))}
        />

        <main className="space-y-3">
          <SummaryCard stats={stats} />
          <TrendCard days={stats.days} />
          <BestDayCard bestDay={stats.bestDay} />
          <LongTaskProgressCard tasks={longTaskProgress} />
        </main>
      </div>

      <BottomNav active="stats" onNavigate={onNavigate} />
    </div>
  );
}
