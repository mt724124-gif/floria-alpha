import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

const CATEGORY_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-violet-500",
  "bg-cyan-500",
];

const INITIAL_CATEGORIES = [
  { name: "仕事", color: "bg-blue-500" },
];

export default function LongTaskModal({
  open,
  onClose,
  onSave,
  editingTask,
  categories,
  setCategories,
}) {
  const today = new Date().toISOString().split("T")[0];
  const getNextDate = (dateString) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

const tomorrow = getNextDate(today);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(today);
const [endDate, setEndDate] = useState(tomorrow);
const [category, setCategory] = useState(categories?.[0] ?? INITIAL_CATEGORIES[0]);
const [newCategoryName, setNewCategoryName] = useState("");
const endDateInputRef = useRef(null);

  useEffect(() => {
  if (!open) return;

  const now = new Date().toISOString().split("T")[0];

  if (editingTask) {
    setTitle(editingTask.title || "");
    setStartDate(editingTask.start || now);
    setEndDate(editingTask.end || getNextDate(now));

    const matchedCategory = categories.find(
  (item) => item.name === editingTask.category
);

setCategory(
  matchedCategory ?? {
    name: editingTask.category,
    color: editingTask.color ?? "bg-slate-400",
  }
);
  } else {
    setTitle("");
    setStartDate(now);
    setEndDate(getNextDate(now));
    setCategory(categories[0] ?? INITIAL_CATEGORIES[0]);
  }

  setNewCategoryName("");
}, [open, editingTask]);


  if (!open) return null;

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.length >= 6) return;
    if (categories.some((item) => item.name === name)) return;

    const usedColors = categories.map((item) => item.color);

const availableColors = CATEGORY_COLORS.filter(
  (color) => !usedColors.includes(color)
);

const nextCategory = {
  name,
  color:
    availableColors[0] ??
    CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length],
};

    setCategories((current) => [...current, nextCategory]);
    setCategory(nextCategory);
    setNewCategoryName("");
  };

  const deleteCategory = (targetName) => {
    if (categories.length <= 1) return;

    setCategories((current) => {
      const next = current.filter((item) => item.name !== targetName);

      if (category.name === targetName) {
        setCategory(next[0]);
      }

      return next;
    });
  };

  const handleSave = () => {
  if (!title.trim()) return;

  const nextTask = {
  ...(editingTask ?? {}),
  id: editingTask?.id ?? Date.now(),
  title: title.trim(),
  start: startDate,
  end: endDate,
  category: category.name,
  color: category.color,
  status: editingTask?.status ?? "進行前",
  dailyPlans: editingTask?.dailyPlans ?? [],
};

  if (editingTask?.dailyPlans?.length) {
    const nextStart = new Date(startDate);
    const nextEnd = new Date(endDate);

    nextStart.setHours(0, 0, 0, 0);
    nextEnd.setHours(0, 0, 0, 0);

    const removedPlans = editingTask.dailyPlans.filter((plan) => {
      const planDate = new Date(plan.date);
      planDate.setHours(0, 0, 0, 0);

      const hasContent =
        String(plan.title ?? "").trim() !== "" ||
        String(plan.memo ?? "").trim() !== "" ||
        plan.estimatedMinutes !== null &&
          plan.estimatedMinutes !== undefined &&
          plan.estimatedMinutes !== "" ||
        plan.actualMinutes !== null &&
          plan.actualMinutes !== undefined &&
          plan.actualMinutes !== "" ||
        plan.completed === true;

      return hasContent && (planDate < nextStart || planDate > nextEnd);
    });

    if (removedPlans.length > 0) {
  const sortedRemovedPlans = [...removedPlans].sort((a, b) =>
  a.date.localeCompare(b.date)
);

const firstDate = sortedRemovedPlans[0].date;
const lastDate =
  sortedRemovedPlans[sortedRemovedPlans.length - 1].date;

const [, firstMonth, firstDay] = firstDate.split("-");
const [, lastMonth, lastDay] = lastDate.split("-");

const firstLabel = `${Number(firstMonth)}/${Number(firstDay)}`;
const lastLabel = `${Number(lastMonth)}/${Number(lastDay)}`;

const rangeLabel =
  firstDate === lastDate
    ? firstLabel
    : `${firstLabel}〜${lastLabel}`;

const ok = window.confirm(
  `期間変更により、入力済みの日別予定が${removedPlans.length}件（${rangeLabel}）期間外になります。\nこの日別予定は削除されます。\n変更を保存しますか？`
);

  if (!ok) return;
}
  }

  onSave(nextTask);
  onClose();
};

  return (
  <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-36 backdrop-blur-[2px]">
    <div className="mx-auto w-full max-w-[480px] rounded-[28px] bg-white px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[20px] font-black text-slate-950">
  {editingTask ? "長期タスクを編集" : "長期タスクを追加"}
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
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[16px] font-bold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </div>

          <div className="flex gap-3">
  <div>
    <p className="mb-2 text-[13px] font-black text-slate-700">
      開始日
    </p>

    <input
  type="date"
      value={startDate}
      onChange={(event) => {
  const value = event.target.value;
  const nextMinEndDate = getNextDate(value);

  setStartDate(value);

  if (endDate < nextMinEndDate) {
    setEndDate(nextMinEndDate);
  }

  setTimeout(() => {
    endDateInputRef.current?.showPicker?.();
    endDateInputRef.current?.focus?.();
  }, 100);
}}
      className="h-11 w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-2 text-[15px] font-bold outline-none"
    />
  </div>

  <div>
    <p className="mb-2 text-[13px] font-black text-slate-700">
      終了日
    </p>

    <input
  ref={endDateInputRef}
  type="date"
      value={endDate}
      min={getNextDate(startDate)}
      onChange={(event) => setEndDate(event.target.value)}
      className="h-11 w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-2 text-[15px] font-bold outline-none"
    />
  </div>
</div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-black text-slate-700">
                カテゴリ
              </p>
              <p className="text-[11px] font-bold text-slate-400">
                {categories.length}/6
              </p>
            </div>

            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="カテゴリを追加"
                disabled={categories.length >= 6}
                className="h-10 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[16px] font-bold outline-none disabled:text-slate-300"
              />

              <button
                type="button"
                onClick={addCategory}
                disabled={categories.length >= 6 || !newCategoryName.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white disabled:bg-slate-200"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((item) => {
                const active = category.name === item.name;
                const canDelete = categories.length > 1;

                return (
                  <div
                    key={item.name}
                    className={`flex items-center gap-1 rounded-full border py-1.5 pl-3 pr-1.5 transition ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCategory(item)}
                      className="flex items-center gap-2 text-[13px] font-black"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      {item.name}
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteCategory(item.name)}
                        className="grid h-6 w-6 place-items-center rounded-full text-slate-300 active:bg-slate-100 active:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
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
          {editingTask ? "変更を保存" : "長期タスクを追加"}
        </button>
      </div>
    </div>
  );
}