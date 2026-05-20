import React, { useEffect, useState } from "react";
import { Plus, Save, X } from "lucide-react";

function getInitialPriority(todo) {
  if (["high", "medium", "low"].includes(todo?.priority)) return todo.priority;
  return "medium";
}

const priorityOptions = [
  { value: "high", label: "高", subLabel: "重要", activeClass: "border-red-300 bg-red-50 text-red-500", inactiveClass: "border-slate-200 bg-white text-slate-400" },
  { value: "medium", label: "中", subLabel: "標準", activeClass: "border-amber-300 bg-amber-50 text-amber-500", inactiveClass: "border-slate-200 bg-white text-slate-400" },
  { value: "low", label: "低", subLabel: "軽め", activeClass: "border-slate-300 bg-slate-100 text-slate-500", inactiveClass: "border-slate-200 bg-white text-slate-400" },
];

export default function TodoModal({ open, mode = "add", initialTodo, categories, onClose, onSave, onAddCategory, onDeleteCategory, compactTimerEdit = false }) {
  const isEditMode = mode === "edit";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(() => localStorage.getItem("last-category") || "学習");
  const [priority, setPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState("");
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

  const hasEstimated = durationHour !== "" || durationMinute !== "";

  const handleDeleteCategory = (targetCategory) => {
    if (targetCategory === "その他") return;
    const fallback = categories.find((item) => item !== targetCategory) ?? "その他";
    if (category === targetCategory) setCategory(fallback);
    onDeleteCategory?.(targetCategory);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim()) return;

    const estimatedMinutes = hasEstimated ? Number(durationHour || 0) * 60 + Number(durationMinute || 0) : null;
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
            className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
          />
        </label>

        {!isEditMode && (
          <div className="mb-4">
            <span className="mb-2 block text-sm font-black text-slate-600">重要度</span>

            <div className="grid grid-cols-3 gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`h-14 rounded-2xl border text-center active:scale-[0.99] ${priority === option.value ? option.activeClass : option.inactiveClass}`}
                >
                  <p className="text-[16px] font-black leading-none">{option.label}</p>
                  <p className="mt-1 text-[10px] font-black opacity-70">{option.subLabel}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isEditMode && (
          <div data-category-dropdown className="relative z-30 mb-4 block">
            <span className="mb-2 block text-sm font-black text-slate-600">カテゴリ</span>

            <div className="relative overflow-visible rounded-2xl border border-slate-200 bg-white">
              <div
                onPointerDown={(e) => {
                  e.preventDefault();
                  setShowCategoryList((prev) => !prev);
                }}
                className="flex h-14 w-full select-none items-center justify-between px-4"
              >
                <span className="text-base font-bold text-slate-800">{category}</span>
                <span className={`text-sm text-slate-400 transition-transform ${showCategoryList ? "rotate-180" : ""}`}>▼</span>
              </div>

              {showCategoryList && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="max-h-[220px] overflow-y-auto">
                    {categories
                      .filter((item) => item !== category)
                      .sort((a, b) => {
                        if (a === "その他") return 1;
                        if (b === "その他") return -1;
                        return 0;
                      })
                      .map((item) => (
                        <div key={item} className="flex h-12 items-center justify-between bg-white px-4 active:bg-slate-100">
                          <div
                            onPointerDown={(e) => {
                              e.preventDefault();
                              setCategory(item);
                              setShowCategoryList(false);
                              setIsAddingCategory(false);
                            }}
                            className="flex-1 select-none text-left text-base font-bold text-slate-900"
                          >
                            {item}
                          </div>

                          {item !== "その他" && (
                            <button type="button" onClick={() => handleDeleteCategory(item)} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 active:bg-slate-200">
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
                      <button type="button" onClick={() => setIsAddingCategory(true)} className="h-12 w-full px-4 text-left text-base font-bold text-slate-600 active:bg-slate-50">
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
        )}

        <div className="mb-4">
          <span className="mb-2 block text-sm font-black text-slate-600">予定時間（任意）</span>

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
              className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
            >
              <option value="">未設定</option>
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i}>{i}時間</option>
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
              className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
            >
              <option value="">未設定</option>
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minute) => (
                <option key={minute} value={minute}>{String(minute).padStart(2, "0")}分</option>
              ))}
            </select>
          </div>

          {!hasEstimated && (
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
                className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
              >
                {Array.from({ length: 13 }, (_, i) => (
                  <option key={i} value={i}>{i}時間</option>
                ))}
              </select>

              <select
                value={actualMinute}
                onChange={(e) => setActualMinute(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minute) => (
                  <option key={minute} value={minute}>{String(minute).padStart(2, "0")}分</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 -mx-5 mt-2 grid grid-cols-2 gap-3 bg-white px-5 pb-1 pt-3">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-slate-100 text-sm font-black text-slate-600 active:scale-[0.99]">
            キャンセル
          </button>

          <button type="submit" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-black text-white shadow-[0_10px_20px_rgba(16,185,129,0.22)] active:scale-[0.99]">
            {isEditMode ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEditMode ? "保存する" : "追加する"}
          </button>
        </div>
      </form>
    </div>
  );
}