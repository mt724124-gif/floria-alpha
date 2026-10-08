import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { parseBackup, summarizeBackup } from "../utils/storage";

export default function DataManagement({ onExport, onRestore, recovery = false }) {
  const [preview, setPreview] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRequest = useRef(0);
  const restoring = useRef(false);
  const buttonClass = "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-[14px] font-black disabled:opacity-40";

  const exportData = () => {
    try {
      onExport();
      setMessage(recovery ? "元データの退避ファイルを作成しました。" : "バックアップファイルを作成しました。");
    } catch (error) {
      setMessage(`ファイルを作成できませんでした。${error.message}`);
    }
  };

  const selectFile = async (event) => {
    const request = ++fileRequest.current;
    const file = event.target.files?.[0];
    setPreview(null);
    setConfirmed(false);
    setMessage("");
    event.target.value = "";
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      if (fileRequest.current !== request) return;
      setPreview({ backup, summary: summarizeBackup(backup), name: file.name });
    } catch (error) {
      if (fileRequest.current === request) setMessage(`復元できないファイルです。${error.message}`);
    }
  };

  const restoreData = async () => {
    if (!preview || !confirmed || restoring.current) return;
    restoring.current = true;
    setBusy(true);
    try {
      await onRestore(preview.backup);
      setPreview(null);
      setConfirmed(false);
      setMessage("バックアップから復元しました。");
    } catch (error) {
      setMessage(error.message);
      setConfirmed(false);
    } finally {
      restoring.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="mb-5" aria-label="データ管理">
      <h2 className="mb-2 px-3 text-[13px] font-black text-slate-800">データ管理</h2>
      <div className="space-y-3 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <p className="text-[12px] font-bold leading-5 text-slate-500">
          {recovery
            ? "元データを退避するか、正常なバックアップを選択してください。退避用ファイルは確認・救出用で、そのまま復元はできません。"
            : "タスク・振り返り・作業時間・AI設定などをJSONファイルに保存できます。"}
        </p>
        <button type="button" disabled={busy} onClick={exportData} className={`${buttonClass} bg-emerald-500 text-white`}>
          <Download className="h-5 w-5" />
          {recovery ? "元データをJSONで退避" : "バックアップを作成"}
        </button>
        <label className={`${buttonClass} relative border border-emerald-300 text-emerald-700 ${busy ? "opacity-40" : "cursor-pointer"}`}>
          <Upload className="h-5 w-5" />バックアップから復元
          <input type="file" accept=".json,application/json" aria-label="復元するJSONファイル" disabled={busy} onChange={selectFile} className="absolute inset-0 w-full cursor-pointer opacity-0" />
        </label>
        {message && <p role="status" className="break-words rounded-xl bg-slate-50 p-3 text-[12px] font-bold leading-5 text-slate-700">{message}</p>}
        {preview && (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
            <h3 className="text-[14px] font-black text-slate-900">復元内容の確認</h3>
            <p className="break-all text-[12px] font-bold text-slate-600">{preview.name}</p>
            <p className="text-[12px] font-bold text-slate-600">
              {preview.backup.legacy ? "旧形式の本体JSON（関連設定は置換時に解除されます）" : `作成日時：${new Date(preview.backup.exportedAt).toLocaleString("ja-JP")}`}
            </p>
            <dl className="grid grid-cols-2 gap-2 text-[12px] font-bold text-slate-700">
              {[["短期・日別タスク", preview.summary.tasks], ["長期タスク", preview.summary.longTasks], ["日別記録", preview.summary.dailyRecords], ["作業記録", preview.summary.workLogs], ["タイマー記録", preview.summary.timerSessions], ["保存項目", preview.summary.keys]].map(([label, count]) => (
                <div key={label}><dt>{label}</dt><dd>{count}件</dd></div>
              ))}
            </dl>
            <p className="text-[12px] font-bold leading-5 text-amber-800">現在のデータと関連設定を置き換えます。自動で混合しません。実行前に現在のデータを退避してください。</p>
            <button type="button" disabled={busy} onClick={exportData} className={`${buttonClass} border border-emerald-300 bg-white text-emerald-700`}>
              {recovery ? "復元前の元データを退避" : "復元前のデータをバックアップ"}
            </button>
            <label className="flex items-start gap-2 text-[12px] font-bold leading-5 text-slate-700">
              <input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-600" />
              現在のデータを置き換えることを確認しました
            </label>
            <button type="button" disabled={!confirmed || busy} onClick={restoreData} className={`${buttonClass} bg-emerald-600 text-white`}>{busy ? "復元中…" : "確認した内容で復元する"}</button>
            <button type="button" disabled={busy} onClick={() => { fileRequest.current += 1; setPreview(null); setConfirmed(false); }} className={`${buttonClass} bg-white text-slate-600`}>キャンセル</button>
          </div>
        )}
      </div>
    </section>
  );
}

export function DataRecovery({ error, onExport, onRestore }) {
  return (
    <main className="min-h-dvh bg-[#f6f8f7] px-3 py-[max(24px,env(safe-area-inset-top))] text-slate-950">
      <div className="mx-auto w-full max-w-[480px]">
        <div role="alert" className="mb-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-[20px] font-black">保存データを保護しています</h1>
          <p className="mt-3 break-words text-[13px] font-bold leading-6">{error}</p>
          <p className="mt-3 text-[13px] font-bold leading-6 text-slate-600">自動保存と通常の操作を停止しています。元データを退避し、正常なバックアップから復元してください。</p>
        </div>
        <DataManagement recovery onExport={onExport} onRestore={onRestore} />
      </div>
    </main>
  );
}
