import { useEffect, useState } from "react";
import { X } from "lucide-react";

const CATEGORY_OPTIONS = [
  { name: "研究", color: "bg-emerald-500" },
  { name: "仕事", color: "bg-blue-500" },
  { name: "学習", color: "bg-pink-500" },
  { name: "生活", color: "bg-orange-500" },
  { name: "その他", color: "bg-violet-500" },
];

export default function LongTaskModal({
  open,
  onClose,
  onSave,
}) {
  const today = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);

  useEffect(() => {
    if (!open) return;

    const now = new Date().toISOString().split("T")[0];

    setTitle("");
    setStartDate(now);
    setEndDate(now);
    setCategory(CATEGORY_OPTIONS[0]);
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      id: Date.now(),
      title: title.trim(),
      start: startDate,
      end: endDate,
      category: category.name,
      color: category.color,
      status: "進行前",
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="w-full max-w-[480px] rounded-t-[28px] bg-white px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[20px] font-black text-slate-950">
            長期タスクを追加
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[13px] font-black text-slate-700">
              タスク名
            </p>

            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例：学会スライド作成"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] font-bold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-[13px] font-black text-slate-700">
                開始日
              </p>

              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[14px] font-bold outline-none"
              />
            </div>

            <div>
              <p className="mb-2 text-[13px] font-black text-slate-700">
                終了日
              </p>

              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[14px] font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-black text-slate-700">
              カテゴリ
            </p>

            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((item) => {
                const active = category.name === item.name;

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-black transition ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${item.color}`}
                    />

                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-6 h-12 w-full rounded-2xl bg-emerald-500 text-[15px] font-black text-white shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
        >
          長期タスクを追加
        </button>
      </div>
    </div>
  );
}