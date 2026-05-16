const DEFAULT_CATEGORY_MINUTES = {
  学習: 0,
  仕事: 0,
  健康: 0,
  その他: 0,
};

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createEmptyDailyRecord(dateKey) {
  return {
    date: dateKey,

    status: "draft", // draft | confirmed
reviewed: false,
reviewedAt: null,
confirmedAt: null,

    tasks: [],

    totalEstimatedMinutes: 0,
    totalActualMinutes: 0,
    completedTaskCount: 0,
    createdTaskCount: 0,
    pendingTaskCount: 0,
    postponedTaskCount: 0,
    deletedTaskCount: 0,
    abandonedTaskCount: 0,

    achievementRate: 0,

    categoryMinutes: { ...DEFAULT_CATEGORY_MINUTES },

    reflectionText: "",
    mood: null,
    energy: null,
    dailyStyle: null,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getOrCreateDailyRecord(
  dailyRecords = {},
  dateKey = getTodayKey()
) {
  return dailyRecords[dateKey] ?? createEmptyDailyRecord(dateKey);
}

function normalizeTaskStatus(task, options = {}) {
  if (options.taskStatus) return options.taskStatus;

  const completed = Boolean(options.completed ?? task?.completed ?? false);

  if (completed) return "completed";

  return task?.taskStatus ?? "pending";
}

export function createTaskSnapshot(task, options = {}) {
  const now = new Date().toISOString();
  const taskStatus = normalizeTaskStatus(task, options);
  const completed = taskStatus === "completed";

  return {
    id: task.id,
    title: task.title ?? "",
    category: task.category ?? "その他",

    estimatedMinutes: Number(task.estimatedMinutes ?? 0),
    actualMinutes: Number(
      options.actualMinutes ??
        task.actualMinutes ??
        task.workedMinutes ??
        task.focusMinutes ??
        0
    ),
    actualSeconds: Number(
      options.actualSeconds ??
        task.actualSeconds ??
        (options.actualMinutes != null ? options.actualMinutes * 60 : 0)
    ),

    completed,
    taskStatus,

    completedAt:
      options.completedAt ??
      task.completedAt ??
      (completed ? now : null),

    usedTimer: Boolean(options.usedTimer ?? task.usedTimer ?? false),
    timerSessionCount: Number(
      options.timerSessionCount ?? task.timerSessionCount ?? 0
    ),

    extensionCount: Number(
      options.extensionCount ?? task.extensionCount ?? 0
    ),

    priority: task.priority ?? "medium",
    memo: task.memo ?? "",

    type: task.type ?? "todo",
schedule: task.schedule ?? null,
reminder: task.reminder ?? null,

    createdAt: task.createdAt ?? now,
    updatedAt: now,
  };
}

export function recalculateDailyRecord(record) {
  const tasks = record.tasks ?? [];

  const activeTasks = tasks.filter((task) => task.taskStatus !== "deleted");
  const completedTasks = activeTasks.filter(
    (task) => task.taskStatus === "completed"
  );

  const totalEstimatedMinutes = activeTasks.reduce(
    (sum, task) => sum + Number(task.estimatedMinutes ?? 0),
    0
  );

  const totalActualMinutes = activeTasks.reduce(
    (sum, task) => sum + Number(task.actualMinutes ?? 0),
    0
  );

  const completedTaskCount = completedTasks.length;
  const createdTaskCount = activeTasks.length;

  const pendingTaskCount = activeTasks.filter(
    (task) => task.taskStatus === "pending"
  ).length;

  const postponedTaskCount = tasks.filter(
    (task) => task.taskStatus === "postponed"
  ).length;

  const deletedTaskCount = tasks.filter(
    (task) => task.taskStatus === "deleted"
  ).length;

  const abandonedTaskCount = tasks.filter(
    (task) => task.taskStatus === "abandoned"
  ).length;

  const achievementRate =
    createdTaskCount === 0
      ? 0
      : Math.round((completedTaskCount / createdTaskCount) * 100);

  const categoryMinutes = { ...DEFAULT_CATEGORY_MINUTES };

  activeTasks.forEach((task) => {
    const category = task.category ?? "その他";

    if (categoryMinutes[category] == null) {
      categoryMinutes[category] = 0;
    }

    categoryMinutes[category] += Number(task.actualMinutes ?? 0);
  });

  return {
    ...record,
    tasks,
    totalEstimatedMinutes,
    totalActualMinutes,
    completedTaskCount,
    createdTaskCount,
    pendingTaskCount,
    postponedTaskCount,
    deletedTaskCount,
    abandonedTaskCount,
    achievementRate,
    categoryMinutes,
    updatedAt: new Date().toISOString(),
  };
}

export function upsertTaskToDailyRecord(record, taskSnapshot) {
  const tasks = record.tasks ?? [];
  const exists = tasks.some((task) => task.id === taskSnapshot.id);

  const nextTasks = exists
    ? tasks.map((task) =>
        task.id === taskSnapshot.id
          ? {
              ...task,
              ...taskSnapshot,
              updatedAt: new Date().toISOString(),
            }
          : task
      )
    : [...tasks, taskSnapshot];

  return recalculateDailyRecord({
    ...record,
    tasks: nextTasks,
    status: record.status ?? "draft",
    reviewed: record.reviewed ?? false,
    updatedAt: new Date().toISOString(),
  });
}

export function updateDailyRecordTask(
  dailyRecords = {},
  dateKey,
  task,
  options = {}
) {
  if (!task?.id || !dateKey) return dailyRecords;

  const currentRecord = getOrCreateDailyRecord(dailyRecords, dateKey);
  const taskSnapshot = createTaskSnapshot(task, options);
  const updatedRecord = upsertTaskToDailyRecord(currentRecord, taskSnapshot);

  return {
    ...dailyRecords,
    [dateKey]: updatedRecord,
  };
}

export function addTaskToDailyRecord(dailyRecords = {}, dateKey, task) {
  return updateDailyRecordTask(dailyRecords, dateKey, task, {
    completed: false,
    taskStatus: "pending",
    completedAt: null,
  });
}

export function updateTaskInDailyRecord(dailyRecords = {}, dateKey, task) {
  return updateDailyRecordTask(dailyRecords, dateKey, task, {
    taskStatus: task.completed ? "completed" : task.taskStatus ?? "pending",
    completed: task.completed ?? false,
    completedAt: task.completed ? task.completedAt ?? new Date().toISOString() : null,
  });
}

export function completeTaskInDailyRecord(
  dailyRecords = {},
  dateKey,
  task,
  completed = true
) {
  return updateDailyRecordTask(dailyRecords, dateKey, task, {
    completed,
    taskStatus: completed ? "completed" : "pending",
    completedAt: completed ? new Date().toISOString() : null,
  });
}

export function updateTaskActualTimeInDailyRecord(
  dailyRecords = {},
  dateKey,
  task,
  actualMinutes,
  actualSeconds
) {
  return updateDailyRecordTask(dailyRecords, dateKey, task, {
    actualMinutes,
    actualSeconds: actualSeconds ?? actualMinutes * 60,
    taskStatus: task.completed ? "completed" : task.taskStatus ?? "pending",
    completed: task.completed ?? false,
  });
}

export function markTaskDeletedInDailyRecord(dailyRecords = {}, dateKey, task) {
  return updateDailyRecordTask(dailyRecords, dateKey, task, {
    completed: false,
    taskStatus: "deleted",
    completedAt: null,
  });
}

export function confirmDailyRecord(
  dailyRecords = {},
  dateKey,
  reviewData = {}
) {
  const currentRecord = getOrCreateDailyRecord(dailyRecords, dateKey);
  const now = new Date().toISOString();

  const confirmedRecord = recalculateDailyRecord({
    ...currentRecord,

    status: "confirmed",
    reviewed: true,
    reviewedAt: now,
    confirmedAt: now,

    reflectionText:
      reviewData.reflectionText ?? currentRecord.reflectionText ?? "",
    mood: reviewData.mood ?? currentRecord.mood ?? null,
    energy: reviewData.energy ?? currentRecord.energy ?? null,
    dailyStyle: reviewData.dailyStyle ?? currentRecord.dailyStyle ?? null,

    updatedAt: now,
  });

  return {
    ...dailyRecords,
    [dateKey]: confirmedRecord,
  };
}

export function unconfirmDailyRecord(dailyRecords = {}, dateKey) {
  const currentRecord = getOrCreateDailyRecord(dailyRecords, dateKey);

  const draftRecord = recalculateDailyRecord({
    ...currentRecord,

    status: "draft",
    reviewed: false,
    reviewedAt: null,
    confirmedAt: null,

    updatedAt: new Date().toISOString(),
  });

  return {
    ...dailyRecords,
    [dateKey]: draftRecord,
  };
}

export function getDailyRecordList(dailyRecords = {}) {
  return Object.values(dailyRecords).sort((a, b) => {
    return a.date.localeCompare(b.date);
  });
}

export function getConfirmedDailyRecordList(dailyRecords = {}) {
  return getDailyRecordList(dailyRecords).filter(
    (record) => record.status === "confirmed"
  );
}

export function syncDailyRecordFromTasks(dailyRecords = {}, dateKey, tasks = []) {
  const currentRecord = getOrCreateDailyRecord(dailyRecords, dateKey);
  const existingTasks = currentRecord.tasks ?? [];
  const existingById = new Map(existingTasks.map((task) => [task.id, task]));

  const syncedTasks = tasks.map((task) => {
    const existing = existingById.get(task.id);

    return createTaskSnapshot(task, {
      actualMinutes: task.actualMinutes ?? existing?.actualMinutes ?? 0,
      actualSeconds: task.actualSeconds ?? existing?.actualSeconds ?? 0,
      completed: task.completed ?? existing?.completed ?? false,
      taskStatus: task.completed ? "completed" : "pending",
      completedAt: task.completed
        ? task.completedAt ?? existing?.completedAt ?? new Date().toISOString()
        : null,
      usedTimer: task.usedTimer ?? existing?.usedTimer ?? false,
      timerSessionCount:
        existing?.timerSessionCount ?? task.timerSessionCount ?? 0,
      extensionCount: existing?.extensionCount ?? task.extensionCount ?? 0,
    });
  });

  const deletedTasks = existingTasks.filter(
    (task) =>
      task.taskStatus === "deleted" &&
      !tasks.some((currentTask) => currentTask.id === task.id)
  );

  const syncedRecord = recalculateDailyRecord({
    ...currentRecord,
    tasks: [...syncedTasks, ...deletedTasks],
  });

  return {
    ...dailyRecords,
    [dateKey]: syncedRecord,
  };
}