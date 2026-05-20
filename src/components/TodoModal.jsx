import React, { useEffect, useState } from "react";
import { Plus, Save, X } from "lucide-react";

function getInitialPriority(todo) {
  if (["high", "medium", "low"].includes(todo?.priority)) return todo.priority;
  return "medium";
}

function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

function getInitialDateKey(todo) {
  return todo?.targetDate ?? todo?.date ?? todo?.createdDate ?? getTodayKey();
}

const priorityOptions = [
  { value: "high", label: "高", activeClass: "border-red-300 bg-red-50 text-red-500", inactiveClass: "border-slate-200 bg-white text-slate-400" },
  { value: "medium", label: "中", activeClass: "border-amber-300 bg-amber-50 text-amber-500", inactiveClass: "border-slate-200 bg-white text-slate-400" },
  { value: "low", label: "低", activeClass: "border-slate-300 bg-slate-100 text-slate-500", inactiveClass: "border-slate-200 bg-white text-slate-400" },
];

export default function TodoModal({ open, mode = "add", initialTodo, categories, onClose, onSave, onAddCategory, onDeleteCategory, compactTimerEdit = false }) {
  const isEditMode = mode === "edit";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(() => localStorage.getItem("last-category") || "学習");
  const [priority, setPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState("");
const [targetDate, setTargetDate] = useState(getTodayKey());
const [hasPlannedTime, setHasPlannedTime] = useState(false);
const [durationHour, setDurationHour] = useState("");
const [durationMinute, setDurationMinute] = useState("");
  const [actualHour, setActualHour] = useState(0);
  const [actualMinute, setActualMinute] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false);


  useEffect(() => {
    if (!open) return;

    if (initialTodo) {
      const estimated = initialTodo.estimatedMinutes;
      const actual = initialTodo.actualMinutes ?? initialTodo.workedMinutes ?? initialTodo.focusMinutes ?? 0;

      setTitle(initialTodo.title ?? "");
      setCategory(initialTodo.category ?? "学習");
      setPriority(getInitialPriority(initialTodo));
      setNewCategory("");
setTargetDate(getInitialDateKey(initialTodo));
setHasPlannedTime(estimated != null);
setDurationHour(estimated == null ? "" : Math.floor(estimated / 60));
setDurationMinute(estimated == null ? "" : estimated % 60);
      setActualHour(Math.floor(actual / 60));
      setActualMinute(actual % 60);
      setCompleted(Boolean(initialTodo.completed));
    } else {
      setTitle("");
      setCategory(localStorage.getItem("last-category") || "学習");
      setPriority("medium");
      setNewCategory("");
setTargetDate(getTodayKey());
setHasPlannedTime(false);
setDurationHour("");
setDurationMinute("");
      setActualHour(0);
      setActualMinute(0);
      setCompleted(false);
    }

    setShowCategoryList(false);
    setIsAddingCategory(false);
  }, [open, initialTodo]);

  if (!open) return null;

  const hasEstimated = hasPlannedTime && (durationHour !== "" || durationMinute !== "");

  const handleDeleteCategory = (targetCategory) => {
    if (targetCategory === "その他") return;
    const fallback = categories.find((item) => item !== targetCategory) ?? "その他";
    if (category === targetCategory) setCategory(fallback);
    onDeleteCategory?.(targetCategory);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim()) return;

    const estimatedMinutes = hasPlannedTime ? Number(durationHour || 0) * 60 + Number(durationMinute || 0) : null;
    const actualMinutes = Number(actualHour || 0) * 60 + Number(actualMinute || 0);

    let finalCategory = isEditMode ? initialTodo?.category ?? category : category;

    if (!isEditMode && category === "__new__") {
      finalCategory = newCategory.trim().slice(0, 30);
      if (!finalCategory) return;
      onAddCategory?.(finalCategory);
    }

    localStorage.setItem("last-category", finalCategory);

    const finalPriority = ["high", "medium", "low"].includes(priority) ? priority : "medium";

    onSave({
      ...initialTodo,
      id: initialTodo?.id,
      type: "todo",
      title: title.trim().slice(0, 30),
      category: finalCategory,
      priority: finalPriority,
      rank: initialTodo?.rank,
targetDate,
date: targetDate,
createdDate: initialTodo?.createdDate ?? targetDate,
estimatedMinutes,
      actualMinutes,
      actualSeconds: actualMinutes * 60,
      workedMinutes: actualMinutes,
      focusMinutes: actualMinutes,
      elapsedMinutes: actualMinutes,
      elapsedSeconds: actualMinutes * 60,
      completed,
      schedule: null,
      reminder: null,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-3 py-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        onPointerDown={(event) => {
          if (!event.target.closest("[data-category-dropdown]")) {
            setShowCategoryList(false);
            setIsAddingCategory(false);
          }
        }}
        className="max-h-[calc(100dvh-12px)] w-full max-w-[420px] overflow-y-auto rounded-[24px] bg-white p-3.5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950">
            {isEditMode ? "Todoを編集" : "Todoを追加"}
          </h2>

          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-black text-slate-400 active:bg-slate-100">
            閉じる
          </button>
        </div>

        <label className="mb-4 block">
  <span className="mb-2 block text-sm font-black text-slate-600">タスク名</span>

  <input
    value={title}
    onChange={(e) => setTitle(e.target.value.slice(0, 30))}
    maxLength={30}
    placeholder="例：英単語を30個覚える"
    className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-[16px] font-bold outline-none focus:border-emerald-400"
  />
</label>

        <div className="mb-4">
  <span className="mb-2 block text-sm font-black text-slate-600">日付</span>

  <div className="relative h-12 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="pointer-events-none flex h-full items-center px-3 text-[16px] font-bold text-slate-900">
      {targetDate.replaceAll("-", "/")}
    </div>

    <input
      type="date"
      value={targetDate}
      onChange={(e) => {
        setTargetDate(e.target.value);
      }}
      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
    />
  </div>
</div>

        {!isEditMode && (
          <div className="mb-4">
            <span className="mb-2 block text-sm font-black text-slate-600">重要度</span>

            <div className="grid grid-cols-3 gap-2">
              {priorityOptions.map((option) => (
                <button
  key={option.value}
  type="button"
  onClick={() => setPriority(option.value)}
                  className={`h-8 rounded-2xl border text-center active:scale-[0.99] ${priority === option.value ? option.activeClass : option.inactiveClass}`}
                >
                  <p className="text-[16px] font-black leading-none">{option.label}</p>
                  <p className="mt-1 text-[10px] font-black opacity-70">{option.subLabel}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isEditMode && (
  <div data-category-dropdown className="mb-4 block">
    <span className="mb-2 block text-sm font-black text-slate-600">カテゴリ</span>

    <div className="flex min-h-[92px] max-h-[132px] flex-wrap gap-2 overflow-y-auto rounded-2xl bg-slate-50 p-3">
      {categories
        .sort((a, b) => {
          if (a === "その他") return 1;
          if (b === "その他") return -1;
          return 0;
        })
        .map((item) => (
          <div key={item} className="relative">
            <button
              type="button"
              onClick={() => {
                setCategory(item);
                setIsAddingCategory(false);
              }}
              className={`h-9 rounded-full border px-3 pr-8 text-sm font-black active:scale-[0.98] ${
                category === item
                  ? "border-emerald-300 bg-emerald-500 text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {item}
            </button>

            {item !== "その他" && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteCategory(item);
                }}
                className={`absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full ${
                  category === item
                    ? "text-white/80 active:bg-emerald-600"
                    : "text-slate-300 active:bg-slate-100 active:text-red-400"
                }`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

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
              }
              setNewCategory("");
              setIsAddingCategory(false);
            }
          }}
          placeholder="新しいカテゴリ"
          className="h-10 min-w-[140px] flex-1 rounded-full border border-emerald-200 bg-white px-4 text-[16px] font-bold outline-none focus:border-emerald-400"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingCategory(true)}
          className="h-9 rounded-full border border-dashed border-slate-300 bg-white px-3 text-sm font-black text-slate-500 active:scale-[0.98]"
        >
          ＋ 追加
        </button>
      )}
    </div>
  </div>
)}

<div className="mb-4">
  <label className="mb-2 flex items-center justify-between">
    <span className="block text-sm font-black text-slate-600">予定時間</span>

    <button
      type="button"
      onClick={() => {
        setHasPlannedTime((current) => {
          const next = !current;
          if (!next) {
            setDurationHour("");
            setDurationMinute("");
          } else {
            setDurationHour(0);
            setDurationMinute(30);
          }
          return next;
        });
      }}
      className={`flex h-8 items-center gap-2 rounded-full px-3 text-xs font-black active:scale-[0.98] ${
        hasPlannedTime ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span
        className={`grid h-4 w-4 place-items-center rounded-full border ${
          hasPlannedTime
            ? "border-white bg-white text-emerald-500"
            : "border-slate-300 bg-white text-transparent"
        }`}
      >
        ✓
      </span>
      入力する
    </button>
  </label>

  {hasPlannedTime && (
    <div className="grid grid-cols-2 gap-3">
      <select
        value={durationHour}
        onChange={(e) => {
          const value = e.target.value;
          setDurationHour(value);

          if (value !== "" && durationMinute === "") {
            setDurationMinute(0);
          }

          if (value === "" && durationMinute === 0) {
            setDurationMinute("");
          }
        }}
        className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-[16px] font-bold outline-none focus:border-emerald-400"
      >
        {Array.from({ length: 13 }, (_, i) => (
          <option key={i} value={i}>
            {i}時間
          </option>
        ))}
      </select>

      <select
        value={durationMinute}
        onChange={(e) => {
          const value = e.target.value;
          setDurationMinute(value);

          if (value !== "" && durationHour === "") {
            setDurationHour(0);
          }

          if (value === "" && durationHour === 0) {
            setDurationHour("");
          }
        }}
        className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-[16px] font-bold outline-none focus:border-emerald-400"
      >
        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minute) => (
          <option key={minute} value={minute}>
            {String(minute).padStart(2, "0")}分
          </option>
        ))}
      </select>
    </div>
  )}

  {!hasPlannedTime && (
    <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-400">
      入力すると予定と実測の差を振り返りやすくなります。
    </p>
  )}
</div>

        {isEditMode && (
          <div className="mb-4">
            <span className="mb-2 block text-sm font-black text-slate-600">実測時間</span>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={actualHour}
                onChange={(e) => setActualHour(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-[16px] font-bold outline-none focus:border-emerald-400"
              >
                {Array.from({ length: 13 }, (_, i) => (
                  <option key={i} value={i}>{i}時間</option>
                ))}
              </select>

              <select
                value={actualMinute}
                onChange={(e) => setActualMinute(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-[16px] font-bold outline-none focus:border-emerald-400"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minute) => (
                  <option key={minute} value={minute}>{String(minute).padStart(2, "0")}分</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {!isAddingCategory && (
  <div className="sticky bottom-0 -mx-5 mt-2 grid grid-cols-2 gap-3 bg-white px-5 pb-1 pt-3">
    <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-slate-100 text-sm font-black text-slate-600 active:scale-[0.99]">
      キャンセル
    </button>

    <button type="submit" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-black text-white shadow-[0_10px_20px_rgba(16,185,129,0.22)] active:scale-[0.99]">
      {isEditMode ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      {isEditMode ? "保存する" : "追加する"}
    </button>
  </div>
)}
      </form>
    </div>
  );
}