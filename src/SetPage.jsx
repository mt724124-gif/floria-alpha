import React from "react";
import {
  Bell,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Info,
  LogOut,
  MessageCircle,
  Palette,
  Settings,
  Sprout,
} from "lucide-react";
import BottomNav from "./components/BottomNav";

function Header() {
  return (
    <header className="mb-5 pt-2 text-center">
      <h1 className="text-[24px] font-black tracking-[-0.04em] text-slate-950">
        設定 (仮)
      </h1>
      <p className="mt-3 text-[13px] font-bold text-slate-500">
        アプリの設定をカスタマイズして、より快適に使いましょう。
      </p>
    </header>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-5">
      <p className="mb-2 px-3 text-[13px] font-black text-slate-800">
        {title}
      </p>
      <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        {children}
      </div>
    </section>
  );
}

function SettingRow({ icon, title, description, value, danger = false }) {
  return (
    <button className="flex min-h-[76px] w-full items-center gap-4 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 active:bg-slate-50">
      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
          danger ? "text-red-500" : "text-emerald-600"
        }`}
      >
        {React.cloneElement(icon, { className: "h-7 w-7", strokeWidth: 2.25 })}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-black text-slate-950">{title}</p>
        {description && (
          <p className="mt-1 truncate text-[12px] font-bold text-slate-500">
            {description}
          </p>
        )}
      </div>

      {value && (
        <span className="shrink-0 text-[12px] font-black text-emerald-600">
          {value}
        </span>
      )}

      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </button>
  );
}

function InfoRow({ icon, title, description, value }) {
  return (
    <div className="flex min-h-[76px] w-full items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-emerald-600">
        {React.cloneElement(icon, { className: "h-7 w-7", strokeWidth: 2.25 })}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-black text-slate-950">{title}</p>
        {description && (
          <p className="mt-1 truncate text-[12px] font-bold text-slate-500">
            {description}
          </p>
        )}
      </div>

      {value && (
        <span className="shrink-0 text-[13px] font-bold text-slate-700">
          {value}
        </span>
      )}
    </div>
  );
}

function NoticeBox({ type = "green" }) {
  const isYellow = type === "yellow";

  return (
    <div
      className={`m-3 flex items-center gap-3 rounded-[20px] border px-4 py-3 ${
        isYellow
          ? "border-amber-100 bg-amber-50/70"
          : "border-emerald-100 bg-emerald-50/70"
      }`}
    >
      <div className="text-[28px]">{isYellow ? "😊" : "🪴"}</div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-relaxed text-slate-700">
          {isYellow
            ? "あなたの声がアプリをより良くします！"
            : "AIに出力することで、あなたの記録をより深く振り返ることができます。"}
        </p>
      </div>

      <button
        className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-black ${
          isYellow
            ? "border-amber-300 text-amber-700"
            : "border-emerald-300 text-emerald-700"
        }`}
      >
        {isYellow ? "送る" : "使い方"}
      </button>
    </div>
  );
}

function PersonalizeCard() {
  return (
    <section className="mb-4 flex items-center gap-4 rounded-[24px] border border-emerald-100 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="grid h-16 w-20 shrink-0 place-items-center rounded-[18px] bg-emerald-50 text-[34px]">
        ⛰️
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-black text-slate-950">
          自分に合った使い方にカスタマイズしよう
        </p>
        <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-500">
          目標やスタイルの設定は「個別化設定」から行えます。
        </p>
      </div>

      <button className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 px-3 py-2 text-[12px] font-black text-emerald-700">
        個別化
        <ChevronRight className="h-4 w-4" />
      </button>
    </section>
  );
}

export default function SettingsPage({ onNavigate }) {
  return (
    <div className="min-h-dvh bg-[#f6f8f7] text-slate-950 antialiased">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#fbfcfb] px-[max(12px,env(safe-area-inset-left))] pb-[calc(94px+env(safe-area-inset-bottom))] pt-[calc(10px+env(safe-area-inset-top))] shadow-[0_0_80px_rgba(15,23,42,0.045)]">
        <Header />

        <Section title="基本設定">
          <SettingRow
            icon={<Bell />}
            title="通知設定"
            description="リマインダーや各種通知の設定を変更します"
            value="オン"
          />
          <SettingRow
            icon={<Palette />}
            title="テーマ設定"
            description="アプリの色やテーマを変更します"
            value="グリーン"
          />
        </Section>

        <Section title="出力の設定">
          <SettingRow
            icon={<ClipboardList />}
            title="AI出力の設定"
            description="AIに出力する際の設定をカスタマイズします"
            value="オン"
          />
          <SettingRow
            icon={<FileText />}
            title="AI出力テンプレート"
            description="AIに渡すプロンプトのテンプレートを設定します"
          />
          <NoticeBox />
        </Section>

        <Section title="サポート">
          <SettingRow
            icon={<HelpCircle />}
            title="ヘルプ・使い方"
            description="使い方のガイドやよくある質問を確認できます"
          />
          <SettingRow
            icon={<MessageCircle />}
            title="お問い合わせ・フィードバック"
            description="ご意見やご要望をお聞かせください"
          />
          <NoticeBox type="yellow" />
        </Section>

        <Section title="アプリ情報">
          <SettingRow
            icon={<Info />}
            title="アプリ情報"
            description="アプリの紹介やプライバシーポリシーなどを確認できます"
          />
          <InfoRow icon={<Sprout />} title="バージョン" value="1.0.0" />
        </Section>

        <Section title="アカウント">
          <SettingRow
            icon={<LogOut />}
            title="ログアウト"
            description="アカウントからログアウトします"
            danger
          />
        </Section>

        <PersonalizeCard />
      </div>

      <BottomNav active="settings" onNavigate={onNavigate} />
    </div>
  );
}