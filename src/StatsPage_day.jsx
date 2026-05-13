import React from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  Flame,
  Lightbulb,
  Menu,
} from "lucide-react";
import BottomNav from "./components/BottomNav";

function Header() {
  return (
    <header className="mb-4 flex h-12 items-center justify-between">
      <button className="grid h-11 w-11 place-items-center rounded-2xl text-slate-950 active:bg-slate-100">
        <Menu className="h-7 w-7" strokeWidth={2.4} />
      </button>

      <h1 className="text-[22px] font-black tracking-[-0.04em] text-slate-950">
        統計 (仮)
      </h1>

      <button className="grid h-11 w-11 place-items-center rounded-2xl text-slate-950 active:bg-slate-100">
        <CalendarDays className="h-7 w-7" strokeWidth={2.3} />
      </button>
    </header>
  );
}

function PeriodTabs() {
  const tabs = ["日", "週", "月", "年"];

  return (
    <div className="mb-4 grid h-13 grid-cols-4 rounded-[22px] border border-slate-100 bg-white p-1 shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`rounded-[18px] text-[16px] font-black ${
            tab === "日"
              ? "bg-emerald-50 text-emerald-600 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.16)]"
              : "text-slate-500"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function SummaryCard() {
  return (
    <section className="mb-4 overflow-hidden rounded-[26px] border border-slate-100 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
      <div className="mb-4">
        <p className="text-[20px] font-black tracking-[-0.04em] text-slate-950">
          今日もおつかれさま！ ✨
        </p>
        <p className="mt-2 text-[13px] font-bold leading-relaxed text-slate-500">
          コツコツ続けることが、未来の自分をつくります。
        </p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100">
        <SummaryItem
          icon={<Clock3 />}
          label="集中時間"
          value="5時間28分"
          sub="昨日より +1時間12分"
        />
        <SummaryItem
          icon={<CheckCircle2 />}
          label="完了タスク"
          value="8個"
          sub="昨日より +2個"
        />
        <SummaryItem
          icon={<CircleDot />}
          label="達成率"
          value="80%"
          sub="昨日より +10%"
        />
      </div>
    </section>
  );
}

function SummaryItem({ icon, label, value, sub }) {
  return (
    <div className="min-w-0 px-2">
      <div className="mb-1 flex items-center gap-1.5 text-emerald-600">
        {React.cloneElement(icon, { className: "h-4 w-4", strokeWidth: 2.4 })}
        <span className="text-[11px] font-black text-slate-600">{label}</span>
      </div>
      <p className="truncate text-[22px] font-black tracking-[-0.05em] text-emerald-600">
        {value}
      </p>
      <p className="mt-1 truncate text-[10px] font-bold text-slate-500">{sub}</p>
    </div>
  );
}

function FocusChartCard() {
  const bars = [
    0, 0, 0, 0, 0, 0, 4, 25, 48, 18, 24, 35,
    45, 51, 42, 58, 64, 52, 36, 24, 18, 7, 3, 0,
  ];

  return (
    <section className="mb-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-emerald-500" strokeWidth={2.4} />
          <h2 className="text-[17px] font-black tracking-[-0.03em] text-slate-950">
            集中時間の推移
          </h2>
        </div>

        <div className="flex items-center gap-1 rounded-2xl bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-600">
          <ChevronLeft className="h-4 w-4" />
          5月13日
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      <div className="relative h-[150px] border-b border-slate-200">
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />

        <div className="flex h-full items-end gap-1 px-1">
          {bars.map((value, index) => (
            <div key={index} className="flex flex-1 items-end justify-center">
              <div
                className="w-full max-w-[9px] rounded-t-md bg-emerald-400"
                style={{ height: `${value}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">
        <span>0時</span>
        <span>6時</span>
        <span>12時</span>
        <span>18時</span>
        <span>24時</span>
      </div>

      <div className="mt-3 flex justify-center gap-4 text-[11px] font-bold text-slate-500">
        <Legend color="bg-emerald-500" label="学習" />
        <Legend color="bg-blue-500" label="仕事" />
        <Legend color="bg-violet-500" label="健康" />
        <Legend color="bg-slate-400" label="その他" />
      </div>
    </section>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${color}`} />
      {label}
    </div>
  );
}

function DetailCards() {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3">
      <section className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <p className="mb-3 text-[15px] font-black text-slate-950">
          カテゴリ別
        </p>

        <div className="mx-auto mb-3 grid h-24 w-24 place-items-center rounded-full border-[16px] border-emerald-400">
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500">合計</p>
            <p className="text-[15px] font-black text-slate-950">5時間</p>
          </div>
        </div>

        <div className="space-y-1.5 text-[11px] font-bold text-slate-500">
          <CategoryRow color="bg-emerald-500" label="学習" value="54%" />
          <CategoryRow color="bg-blue-500" label="仕事" value="28%" />
          <CategoryRow color="bg-violet-500" label="健康" value="13%" />
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <div className="mb-2 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" fill="currentColor" />
          <p className="text-[15px] font-black text-slate-950">連続記録</p>
        </div>

        <p className="text-[34px] font-black tracking-[-0.06em] text-slate-950">
          14日
        </p>
        <p className="mb-4 text-[11px] font-bold text-slate-500">
          連続で集中しています！
        </p>

        <div className="grid grid-cols-4 gap-1.5">
          {["5/10", "5/11", "5/12", "5/13"].map((day, index) => (
            <div
              key={day}
              className={`grid h-12 place-items-center rounded-2xl text-[10px] font-black ${
                index === 3
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              ✓
              <span>{day}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CategoryRow({ color, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </div>
      <span>{value}</span>
    </div>
  );
}

function AdviceCard() {
  return (
    <section className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-50">
          <Lightbulb className="h-6 w-6 text-amber-400" fill="currentColor" />
        </div>
        <div>
          <p className="text-[15px] font-black text-emerald-600">
            ワンポイントアドバイス
          </p>
          <p className="mt-1 text-[12px] font-bold leading-relaxed text-slate-600">
            午前中に集中できる時間をうまく使えています。この調子で、自分のペースを大切に続けていきましょう。
          </p>
        </div>
      </div>
    </section>
  );
}

export default function StatsPage({ onNavigate }) {
  return (
    <div className="min-h-dvh bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#fbfcfb] px-[max(12px,env(safe-area-inset-left))] pb-[calc(94px+env(safe-area-inset-bottom))] pt-[calc(10px+env(safe-area-inset-top))] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <Header />
        <PeriodTabs />

        <main>
          <SummaryCard />
          <FocusChartCard />
          <DetailCards />
          <AdviceCard />
        </main>
      </div>

      <BottomNav active="stats" onNavigate={onNavigate} />
    </div>
  );
}