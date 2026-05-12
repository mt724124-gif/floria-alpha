import React, { useEffect, useState } from "react";
import { Plus, Save, X } from "lucide-react";

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaultScheduledTime() {
  const date = new Date();
  date.setHours(date.getHours() + 3, 0, 0, 0);

  return {
    hour: String(date.getHours()).padStart(2, "0"),
    minute: "00",
  };
}

export default function TodoModal({
  open,
  mode = "add",
  initialTodo,
  categories,
  onClose,
  onSave,
  onAddCategory,
  onDeleteCategory,
  compactTimerEdit = false,
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("学習");
  const [itemType, setItemType] = useState("todo");
  const [newCategory, setNewCategory] = useState("");
  const [durationHour, setDurationHour] = useState(1);
  const [durationMinute, setDurationMinute] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [useTimeSetting, setUseTimeSetting] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [timeMode, setTimeMode] = useState("start");
  const [scheduledDate, setScheduledDate] = useState(() =>
    formatDateForInput(new Date())
  );
  const [scheduledHour, setScheduledHour] = useState(
    () => getDefaultScheduledTime().hour
  );
  const [scheduledMinute, setScheduledMinute] = useState("00");
  const [reminderLead, setReminderLead] = useState("10");

  useEffect(() => {
    if (!open) return;

    if (initialTodo) {
        setItemType(initialTodo.type ?? "todo");
        setTitle(initialTodo.title ?? "");
        setCategory(initialTodo.category ?? "学習");
      setNewCategory("");
      setDurationHour(Math.floor((initialTodo.estimatedMinutes ?? 60) / 60));
      setDurationMinute((initialTodo.estimatedMinutes ?? 60) % 60);
      setCompleted(Boolean(initialTodo.completed));
      setUseTimeSetting(Boolean(initialTodo.schedule));
      setTimeMode(initialTodo.schedule?.mode ?? "start");
      setScheduledDate(initialTodo.schedule?.date ?? formatDateForInput(new Date()));

      const defaultTime = getDefaultScheduledTime();
      const [h, m] = (initialTodo.schedule?.time ?? `${defaultTime.hour}:00`).split(":");
      setScheduledHour(h ?? defaultTime.hour);
      setScheduledMinute(m ?? "00");
      setReminderLead(
  initialTodo.reminder?.reminderLead ??
  initialTodo.schedule?.reminderLead ??
  "10"
);
    } else {
      const defaultTime = getDefaultScheduledTime();

      setItemType("todo");
        setTitle("");
        setCategory("学習");
      setNewCategory("");
      setDurationHour(1);
      setDurationMinute(0);
      setCompleted(false);
      setUseTimeSetting(false);
      setTimeMode("start");
      setScheduledDate(formatDateForInput(new Date()));
      setScheduledHour(defaultTime.hour);
      setScheduledMinute("00");
      setReminderLead("10");
    }
  }, [open, initialTodo]);

  if (!open) return null;

  const handleDeleteCategory = (targetCategory) => {
    if (targetCategory === "その他") return;

    const fallback = categories.find((item) => item !== targetCategory) ?? "その他";
    if (category === targetCategory) setCategory(fallback);

    onDeleteCategory?.(targetCategory);
  };

  const submit = (event) => {
    event.preventDefault();

    if (!title.trim()) return;

    const estimatedMinutes = Number(durationHour) * 60 + Number(durationMinute);

if (itemType === "todo" && estimatedMinutes <= 0) return;

    let finalCategory = category;

    if (category === "__new__") {
      finalCategory = newCategory.trim().slice(0, 30);
      if (!finalCategory) return;
      onAddCategory?.(finalCategory);
    }

    onSave({
  id: initialTodo?.id,
  type: itemType,
  title: title.trim().slice(0, 30),
  category: finalCategory,
  estimatedMinutes: itemType === "todo" ? estimatedMinutes : 0,
  completed,
  schedule:
  itemType === "todo" && useTimeSetting
    ? {
        mode: "start",
        date: scheduledDate,
        time: `${scheduledHour}:${scheduledMinute}`,
        reminderLead,
      }
    : null,
reminder:
  itemType === "reminder"
    ? {
        mode: "start",
        date: scheduledDate,
        time: `${scheduledHour}:${scheduledMinute}`,
        reminderLead,
      }
    : null,
});

    onClose();
  };

  return (
    <div
  className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 pb-5 backdrop-blur-sm"
>
      <form
  onSubmit={submit}
  onPointerDown={(e) => {
    if (!e.target.closest("[data-category-dropdown]")) {
      setShowCategoryList(false);
      setIsAddingCategory(false);
    }
  }}
        className="max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-950">
            {mode === "edit" ? "Todoを編集" : "Todoを追加"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-black text-slate-400 active:bg-slate-100"
          >
            閉じる
          </button>
        </div>

      {!compactTimerEdit && (
  <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-100 bg-white">
    <button
      type="button"
      onClick={() => setItemType("todo")}
      className={`h-12 text-sm font-black ${
        itemType === "todo" ? "bg-emerald-500 text-white" : "text-slate-400"
      }`}
    >
      Todo
    </button>
    <button
      type="button"
      onClick={() => setItemType("reminder")}
      className={`h-12 text-sm font-black ${
        itemType === "reminder" ? "bg-emerald-500 text-white" : "text-slate-400"
      }`}
    >
      リマインド
    </button>
  </div>
)}

<label className="mb-4 block">
  <span className="mb-2 block text-sm font-black text-slate-600">
    {itemType === "todo" ? "タスク名" : "リマインド名"}
  </span>
  <input
    value={title}
    onChange={(e) => setTitle(e.target.value.slice(0, 30))}
    maxLength={30}
    placeholder={itemType === "todo" ? "例：英単語を30個覚える" : "例：13時から会議"}
    className="h-14 w-full rounded-2xl border border-slate-200 px-4 text-base font-bold outline-none focus:border-emerald-400"
  />
</label>

<div
  data-category-dropdown
  className="relative z-30 mb-4 block"
>
  <span className="mb-2 block text-sm font-black text-slate-600">
    カテゴリ
  </span>

  <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white">
   <div
  onPointerDown={(e) => {
    e.preventDefault();
    setShowCategoryList((prev) => !prev);
  }}
  className="flex h-14 w-full select-none cursor-pointer items-center justify-between px-4"
>
      <span className="text-base font-bold text-slate-800">
        {category}
      </span>

      <span
        className={`text-sm text-slate-400 transition-transform ${
          showCategoryList ? "rotate-180" : ""
        }`}
      >
        ▼
      </span>
    </div>

    {showCategoryList && (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="max-h-[240px] overflow-y-auto">
          {categories
  .filter((item) => item !== category)
  .sort((a, b) => {
    if (a === "その他") return 1;
    if (b === "その他") return -1;
    return 0;
  })
  .map((item) => (
              <div
                key={item}
                className={`flex h-12 items-center justify-between px-4 transition-colors ${
  category === item
    ? "bg-slate-300"
    : "bg-white hover:bg-slate-100"
}`}
              >
                <div
  onPointerDown={(e) => {
    e.preventDefault();
    setCategory(item);
    setShowCategoryList(false);
    setIsAddingCategory(false);
  }}
  className="flex-1 cursor-pointer select-none text-left text-base font-bold text-slate-900"
>
  {item}
</div>

                {item !== "その他" && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(item)}
                    className="grid h-8 w-8 place-items-center rounded-full text-slate-400 active:bg-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
        </div>

        <div className="border-t border-slate-100 bg-white">
          {isAddingCategory ? (
            <input
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value.slice(0, 30))}
              onBlur={() => {
                const name = newCategory.trim().slice(0, 30);
                const exists = categories.some((item) => item === name);

                if (name && !exists) {
                  onAddCategory?.(name);
                  setCategory(name);
                  setShowCategoryList(false);
                }

                setNewCategory("");
                setIsAddingCategory(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();

                  const name = newCategory.trim().slice(0, 30);
                  const exists = categories.some((item) => item === name);

                  if (name && !exists) {
                    onAddCategory?.(name);
                    setCategory(name);
                    setShowCategoryList(false);
                  }

                  setNewCategory("");
                  setIsAddingCategory(false);
                }
              }}
              placeholder="新しいカテゴリ名"
              className="h-12 w-full px-4 text-base font-bold outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingCategory(true)}
              className="h-12 w-full px-4 text-left text-base font-bold text-slate-600 active:bg-slate-50"
            >
              ＋ 新しいカテゴリを追加
            </button>
          )}
        </div>
      </div>
    )}
  </div>

  <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-400">
    ※ 削除したカテゴリが使われているTodoは「その他」に変更されます。
  </p>
</div>
       

        {itemType === "todo" && (
  <div className="mb-4">
    <span className="mb-2 block text-sm font-black text-slate-600">
      予定時間
    </span>
    <div className="grid grid-cols-2 gap-3">
            <select
              value={durationHour}
              onChange={(e) => setDurationHour(e.target.value)}
              className="h-14 w-full rounded-2xl border border-slate-200 px-4 text-base font-bold outline-none focus:border-emerald-400"
            >
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>
                  {i}時間
                </option>
              ))}
            </select>

            <select
              value={durationMinute}
              onChange={(e) => setDurationMinute(e.target.value)}
              className="h-14 w-full rounded-2xl border border-slate-200 px-4 text-base font-bold outline-none focus:border-emerald-400"
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(
                (minute) => (
                  <option key={minute} value={minute}>
                    {String(minute).padStart(2, "0")}分
                  </option>
                )
              )}
            </select>
          </div>
        </div>
        )}

        {mode === "edit" && !compactTimerEdit && (
          <label className="mb-4 flex items-center justify-between rounded-[20px] border border-slate-100 bg-slate-50/70 p-4">
            <span className="text-sm font-black text-slate-700">
              達成済みにする
            </span>
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="h-5 w-5 accent-emerald-500"
            />
          </label>
        )}

       {!compactTimerEdit && (
  <div className="mb-5 rounded-[22px] border border-slate-100 bg-slate-50/70 p-4">
    {itemType === "todo" ? (
      <label className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-900">リマインド設定</p>
        </div>
        <input
          type="checkbox"
          checked={useTimeSetting}
          onChange={(e) => setUseTimeSetting(e.target.checked)}
          className="h-5 w-5 accent-emerald-500"
        />
      </label>
    ) : (
      <div>
        <p className="text-sm font-black text-slate-900">リマインド設定</p>
      </div>
    )}

    {(useTimeSetting || itemType === "reminder") && (
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-2 block text-xs font-black text-slate-500">
              日付
            </span>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-black text-slate-500">
              時間
            </span>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={scheduledHour}
                onChange={(e) => setScheduledHour(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
              >
                {Array.from({ length: 24 }, (_, i) =>
                  String(i).padStart(2, "0")
                ).map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}時
                  </option>
                ))}
              </select>

              <select
                value={scheduledMinute}
                onChange={(e) => setScheduledMinute(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
              >
                {Array.from({ length: 12 }, (_, i) =>
                  String(i * 5).padStart(2, "0")
                ).map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}分
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-black text-slate-500">
            リマインド予定
          </span>
          <select
            value={reminderLead}
            onChange={(e) => setReminderLead(e.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
          >
            <option value="0">指定時刻ちょうど</option>
            <option value="5">5分前</option>
            <option value="10">10分前</option>
            <option value="30">30分前</option>
            <option value="60">1時間前</option>
            <option value="1440">1日前</option>
          </select>

          <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-400">
            ※ 実際の通知機能は今後実装予定。今はTodo情報として保存します。
          </p>
        </label>
      </div>
    )}
  </div>
)}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-14 rounded-2xl bg-slate-100 text-base font-black text-slate-600"
          >
            キャンセル
          </button>

          <button
            type="submit"
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-black text-white shadow-[0_10px_20px_rgba(16,185,129,0.22)]"
          >
            {mode === "edit" ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {mode === "edit" ? "保存する" : "追加する"}
          </button>
        </div>
      </form>
    </div>
  );
}