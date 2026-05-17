import React, { useEffect, useRef, useState } from "react";
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
  return { hour: String(date.getHours()).padStart(2, "0"), minute: "00" };
}

const priorityOptions = [
  { value: "high", label: "高", subLabel: "重要", activeClass: "border-red-300 bg-red-50 text-red-500", inactiveClass: "border-slate-200 bg-white text-slate-400" },
  { value: "medium", label: "中", subLabel: "標準", activeClass: "border-amber-300 bg-amber-50 text-amber-500", inactiveClass: "border-slate-200 bg-white text-slate-400" },
  { value: "low", label: "低", subLabel: "軽め", activeClass: "border-slate-300 bg-slate-100 text-slate-500", inactiveClass: "border-slate-200 bg-white text-slate-400" },
];

function WheelColumn({ values, value, onChange, formatter = (item) => item }) {
  const itemHeight = 34;
  const ref = useRef(null);
  const scrollTimerRef = useRef(null);

  useEffect(() => {
    const index = values.findIndex((item) => String(item) === String(value));
    if (index < 0 || !ref.current) return;

    ref.current.scrollTo({
      top: index * itemHeight,
      behavior: "auto",
    });
  }, [value, values]);

  const handleScroll = () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);

    scrollTimerRef.current = setTimeout(() => {
      if (!ref.current) return;

      const index = Math.round(ref.current.scrollTop / itemHeight);
      const safeIndex = Math.max(0, Math.min(values.length - 1, index));
      const nextValue = values[safeIndex];

      ref.current.scrollTo({
        top: safeIndex * itemHeight,
        behavior: "smooth",
      });

      if (String(nextValue) !== String(value)) {
        onChange(nextValue);
      }
    }, 80);
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="relative h-[102px] flex-1 snap-y snap-mandatory overflow-y-auto py-[34px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {values.map((item) => {
        const selected = String(value) === String(item);

        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`block h-[34px] w-full snap-center text-center text-[21px] font-bold leading-[34px] transition ${
              selected ? "scale-100 text-slate-950" : "scale-[0.86] text-slate-300"
            }`}
          >
            {formatter(item)}
          </button>
        );
      })}
    </div>
  );
}

function DurationWheel({ enabled = true, hour, minute, onHourChange, onMinuteChange }) {
  if (!enabled) return null;

  return (
    <div className="relative rounded-[18px] bg-slate-50 px-2 py-1.5">
      <div className="pointer-events-none absolute left-2 right-2 top-1/2 h-[34px] -translate-y-1/2 rounded-xl bg-white shadow-sm" />
      <div className="relative z-10 flex items-center">
        <WheelColumn
          values={Array.from({ length: 13 }, (_, i) => i)}
          value={hour}
          onChange={onHourChange}
        />
        <WheelColumn
          values={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]}
          value={minute}
          onChange={onMinuteChange}
          formatter={(item) => String(item).padStart(2, "0")}
        />
      </div>
      <div className="relative z-10 grid grid-cols-2 text-center text-[11px] font-black text-slate-400">
        <span>時間</span>
        <span>分</span>
      </div>
    </div>
  );
}

function ClockWheel({ hour, minute, onHourChange, onMinuteChange }) {
  return (
    <div className="relative rounded-[18px] bg-slate-50 px-2 py-1.5">
      <div className="pointer-events-none absolute left-2 right-2 top-1/2 h-[34px] -translate-y-1/2 rounded-xl bg-white shadow-sm" />
      <div className="relative z-10 flex items-center">
        <WheelColumn
          values={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))}
          value={hour}
          onChange={onHourChange}
        />
        <WheelColumn
          values={Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"))}
          value={minute}
          onChange={onMinuteChange}
        />
      </div>
      <div className="relative z-10 grid grid-cols-2 text-center text-[11px] font-black text-slate-400">
        <span>時</span>
        <span>分</span>
      </div>
    </div>
  );
}

export default function TodoModal({ open, mode = "add", initialTodo, categories, onClose, onSave, onAddCategory, onDeleteCategory, compactTimerEdit = false }) {
  const isEditMode = mode === "edit";
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("学習");
  const [priority, setPriority] = useState("medium");
  const [itemType, setItemType] = useState("todo");
  const [newCategory, setNewCategory] = useState("");
  const [useEstimatedTime, setUseEstimatedTime] = useState(false);
  const [durationHour, setDurationHour] = useState(1);
  const [durationMinute, setDurationMinute] = useState(0);
  const [actualHour, setActualHour] = useState(0);
  const [actualMinute, setActualMinute] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [useTimeSetting, setUseTimeSetting] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => formatDateForInput(new Date()));
  const [scheduledHour, setScheduledHour] = useState(() => getDefaultScheduledTime().hour);
  const [scheduledMinute, setScheduledMinute] = useState("00");
  const [reminderLead, setReminderLead] = useState("10");

  useEffect(() => {
    if (!open) return;

    if (initialTodo) {
      const defaultTime = getDefaultScheduledTime();
      const [h, m] = (initialTodo.schedule?.time ?? initialTodo.reminder?.time ?? `${defaultTime.hour}:00`).split(":");
      const estimated = initialTodo.estimatedMinutes;
      const actual = initialTodo.actualMinutes ?? initialTodo.workedMinutes ?? initialTodo.focusMinutes ?? 0;

      setItemType(initialTodo.type ?? "todo");
      setTitle(initialTodo.title ?? "");
      setCategory(initialTodo.category ?? "学習");
      setPriority(initialTodo.priority ?? "medium");
      setNewCategory("");
      setUseEstimatedTime(estimated != null);
      setDurationHour(estimated == null ? 1 : Math.floor(estimated / 60));
      setDurationMinute(estimated == null ? 0 : estimated % 60);
      setActualHour(Math.floor(actual / 60));
      setActualMinute(actual % 60);
      setCompleted(Boolean(initialTodo.completed));
      setUseTimeSetting(Boolean(initialTodo.schedule));
      setScheduledDate(initialTodo.schedule?.date ?? initialTodo.reminder?.date ?? formatDateForInput(new Date()));
      setScheduledHour(h ?? defaultTime.hour);
      setScheduledMinute(m ?? "00");
      setReminderLead(initialTodo.reminder?.reminderLead ?? initialTodo.schedule?.reminderLead ?? "10");
    } else {
      const defaultTime = getDefaultScheduledTime();

      setItemType("todo");
      setTitle("");
      setCategory("学習");
      setPriority("medium");
      setNewCategory("");
      setUseEstimatedTime(false);
      setDurationHour(1);
      setDurationMinute(0);
      setActualHour(0);
      setActualMinute(0);
      setCompleted(false);
      setUseTimeSetting(false);
      setScheduledDate(formatDateForInput(new Date()));
      setScheduledHour(defaultTime.hour);
      setScheduledMinute("00");
      setReminderLead("10");
    }

    setShowCategoryList(false);
    setIsAddingCategory(false);
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

    const estimatedMinutes = useEstimatedTime ? Number(durationHour || 0) * 60 + Number(durationMinute || 0) : null;
    const actualMinutes = Number(actualHour || 0) * 60 + Number(actualMinute || 0);

    let finalCategory = isEditMode ? initialTodo?.category ?? category : category;

    if (!isEditMode && category === "__new__") {
      finalCategory = newCategory.trim().slice(0, 30);
      if (!finalCategory) return;
      onAddCategory?.(finalCategory);
    }

    const finalType = isEditMode ? initialTodo?.type ?? itemType : itemType;
    const finalPriority = isEditMode ? initialTodo?.priority ?? priority : priority ?? "medium";

    onSave({
      ...initialTodo,
      id: initialTodo?.id,
      type: finalType,
      title: title.trim().slice(0, 30),
      category: finalCategory,
      priority: finalPriority,
      rank: initialTodo?.rank,
      estimatedMinutes: finalType === "todo" ? estimatedMinutes : 0,
      actualMinutes: finalType === "todo" ? actualMinutes : 0,
      completed,
      schedule:
        finalType === "todo" && useTimeSetting
          ? { mode: "start", date: scheduledDate, time: `${scheduledHour}:${scheduledMinute}`, reminderLead }
          : null,
      reminder:
        finalType === "reminder"
          ? { mode: "start", date: scheduledDate, time: `${scheduledHour}:${scheduledMinute}`, reminderLead }
          : null,
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

        {!isEditMode && !compactTimerEdit && (
          <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <button type="button" onClick={() => setItemType("todo")} className={`h-12 text-sm font-black ${itemType === "todo" ? "bg-emerald-500 text-white" : "text-slate-400"}`}>
              Todo
            </button>
            <button type="button" onClick={() => setItemType("reminder")} className={`h-12 text-sm font-black ${itemType === "reminder" ? "bg-emerald-500 text-white" : "text-slate-400"}`}>
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
            className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
          />
        </label>

        {!isEditMode && (
          <>
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
          </>
        )}

        {itemType === "todo" && (
          <div className="mb-4">
            <label className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-600">予定時間</p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                  未設定でも保存できます
                </p>
              </div>
              <input
                type="checkbox"
                checked={useEstimatedTime}
                onChange={(e) => setUseEstimatedTime(e.target.checked)}
                className="h-5 w-5 accent-emerald-500"
              />
            </label>

            <DurationWheel
              enabled={useEstimatedTime}
              hour={durationHour}
              minute={durationMinute}
              onHourChange={setDurationHour}
              onMinuteChange={setDurationMinute}
            />
          </div>
        )}

        {isEditMode && itemType === "todo" && (
          <div className="mb-4">
            <span className="mb-2 block text-sm font-black text-slate-600">実測時間</span>
            <DurationWheel
              enabled
              hour={actualHour}
              minute={actualMinute}
              onHourChange={setActualHour}
              onMinuteChange={setActualMinute}
            />
          </div>
        )}

        <div className="mb-4 rounded-[20px] border border-slate-100 bg-slate-50/70 p-3.5">
          {itemType === "todo" ? (
            <label className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">リマインド設定</p>
              </div>
              <input type="checkbox" checked={useTimeSetting} onChange={(e) => setUseTimeSetting(e.target.checked)} className="h-5 w-5 accent-emerald-500" />
            </label>
          ) : (
            <div>
              <p className="text-sm font-black text-slate-900">リマインド設定</p>
            </div>
          )}

          {(useTimeSetting || itemType === "reminder") && (
            <div className="mt-4 space-y-4">
              <label className="block w-fit">
                <span className="mb-2 block text-sm font-black text-slate-600">日付</span>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="h-12 w-[220px] rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400"
                />
              </label>

              <div>
                <span className="mb-2 block text-sm font-black text-slate-600">時間</span>
                <ClockWheel
                  hour={scheduledHour}
                  minute={scheduledMinute}
                  onHourChange={setScheduledHour}
                  onMinuteChange={setScheduledMinute}
                />
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-500">リマインド予定</span>
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