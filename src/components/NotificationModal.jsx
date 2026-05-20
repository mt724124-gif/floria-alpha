import { Bell, Clock, X } from "lucide-react";

export default function NotificationModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/30 px-4 pb-4">
      <div className="w-full max-w-[430px] rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-500">
              <Bell className="h-6 w-6" strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-[18px] font-black tracking-[-0.03em] text-slate-950">
                通知設定
              </h2>
              <p className="mt-0.5 text-xs font-bold text-slate-400">
                今日の確認をやさしくリマインドします
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl text-slate-400 active:bg-slate-100"
          >
            <X className="h-6 w-6" strokeWidth={2.4} />
          </button>
        </div>

        <div className="space-y-3">
          <NotificationItem
            time="9:00"
            title="今日のタスク確認"
            text="TodayPageを開いて、今日やることを確認します。"
          />
          <NotificationItem
            time="12:00"
            title="午後の見直し"
            text="午後に進めるタスクを軽く見直します。"
          />
          <NotificationItem
            time="21:00"
            title="今日の振り返り"
            text="今日の達成状況を確認して、1日を締めます。"
          />
        </div>

        <button
          type="button"
          className="mt-5 h-13 w-full rounded-[20px] bg-emerald-500 text-[15px] font-black text-white shadow-[0_12px_24px_rgba(16,185,129,0.25)] active:scale-[0.98]"
        >
          通知をオンにする
        </button>

        <p className="mt-3 text-center text-[11px] font-bold leading-relaxed text-slate-400">
          まずは固定文通知から始めます。残りタスク数つき通知は後で対応します。
        </p>
      </div>
    </div>
  );
}

function NotificationItem({ time, title, text }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-emerald-500">
        <Clock className="h-5 w-5" strokeWidth={2.4} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-black text-slate-950">{time}</p>
          <p className="truncate text-[14px] font-black text-slate-800">
            {title}
          </p>
        </div>
        <p className="mt-0.5 text-[12px] font-bold leading-relaxed text-slate-400">
          {text}
        </p>
      </div>
    </div>
  );
}