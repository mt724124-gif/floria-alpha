const DEFAULT_CATEGORY_MINUTES = {
  学習: 0,
  仕事: 0,
  健康: 0,
  その他: 0,
};

const DEFAULT_PRIORITY_COUNTS = {
  high: 0,
  medium: 0,
  low: 0,
};

const PRIORITY_ORDER = ["high", "medium", "low"];

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizePriority(priority) {
  return PRIORITY_ORDER.includes(priority) ? priority : "medium";
}

function normalizeRank(rank, fallback = null) {
  const numericRank = Number(rank);
  if (Number.isFinite(numericRank) && numericRank > 0) return numericRank;
  return fallback;
}

export function createEmptyDailyRecord(dateKey) {
  return {
    date: dateKey,

    status: "draft",
    reviewed: false,
    reviewedAt: null,
    confirmedAt: null,

    reviewCompleted: false,
    reviewCompletedAt: null,

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
    priorityCounts: { ...DEFAULT_PRIORITY_COUNTS },

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

function isRecordConfirmed(record) {
  return (
    record?.status === "confirmed" ||
    record?.reviewCompleted === true ||
    record?.reviewed === true
  );
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

    priority: normalizePriority(options.priority ?? task.priority),
    rank: normalizeRank(options.rank ?? task.rank),

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

    memo: task.memo ?? "",

    type: task.type ?? "todo",
    schedule: task.schedule ?? null,
    reminder: task.reminder ?? null,

    targetDate: task.targetDate ?? task.date ?? null,
    date: task.date ?? task.targetDate ?? null,
    createdDate: task.createdDate ?? null,
    postponedToDate: task.postponedToDate ?? null,
    postponedFromDate: task.postponedFromDate ?? null,
    postponedCloneId: task.postponedCloneId ?? null,
    originalTaskId: task.originalTaskId ?? null,

    createdAt: task.createdAt ?? now,
    updatedAt: now,
  };
}

function normalizeTaskRanks(tasks = []) {
  return [...tasks]
    .sort((a, b) => {
      const rankA = normalizeRank(a.rank, 9999);
      const rankB = normalizeRank(b.rank, 9999);
      if (rankA !== rankB) return rankA - rankB;
      return Number(a.id ?? 0) - Number(b.id ?? 0);
    })
    .map((task, index) => ({
      ...task,
      priority: normalizePriority(task.priority),
      rank: normalizeRank(task.rank, index + 1),
    }));
}

export function recalculateDailyRecord(record) {
  const now = new Date().toISOString();
  const tasks = normalizeTaskRanks(record.tasks ?? []);

  const activeTasks = tasks.filter((task) => task.taskStatus !== "deleted");

  const completedTasks = activeTasks.filter(
    (task) => task.taskStatus === "completed"
  );

  const pendingTaskCount = activeTasks.filter(
    (task) => task.taskStatus === "pending"
  ).length;

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
  const priorityCounts = { ...DEFAULT_PRIORITY_COUNTS };

  activeTasks.forEach((task) => {
    const category = task.category ?? "その他";

    if (categoryMinutes[category] == null) {
      categoryMinutes[category] = 0;
    }

    categoryMinutes[category] += Number(task.actualMinutes ?? 0);

    const priority = normalizePriority(task.priority);

    if (priorityCounts[priority] == null) {
      priorityCounts[priority] = 0;
    }

    priorityCounts[priority] += 1;
  });

  let status = record.status ?? "draft";
  let reviewed = record.reviewed ?? false;
  let reviewedAt = record.reviewedAt ?? null;
  let confirmedAt = record.confirmedAt ?? null;
  let reviewCompleted = record.reviewCompleted ?? false;
  let reviewCompletedAt = record.reviewCompletedAt ?? null;

  if (createdTaskCount === 0) {
    status = "confirmed";
    reviewed = true;
    reviewedAt = reviewedAt ?? now;
    confirmedAt = confirmedAt ?? now;
    reviewCompleted = true;
    reviewCompletedAt = reviewCompletedAt ?? confirmedAt ?? now;
  } else if (pendingTaskCount > 0) {
    status = "draft";
    reviewed = false;
    reviewedAt = null;
    confirmedAt = null;
    reviewCompleted = false;
    reviewCompletedAt = null;
  } else if (record.forceDraft === true) {
    status = "draft";
    reviewed = false;
    reviewedAt = null;
    confirmedAt = null;
    reviewCompleted = false;
    reviewCompletedAt = null;
  } else if (isRecordConfirmed(record)) {
    status = "confirmed";
    reviewed = true;
    reviewedAt = reviewedAt ?? now;
    confirmedAt = confirmedAt ?? now;
    reviewCompleted = true;
    reviewCompletedAt = reviewCompletedAt ?? confirmedAt ?? now;
  } else {
    status = "draft";
    reviewed = false;
    reviewedAt = null;
    confirmedAt = null;
    reviewCompleted = false;
    reviewCompletedAt = null;
  }

  return {
    ...record,
    tasks,
    status,
    reviewed,
    reviewedAt,
    confirmedAt,
    reviewCompleted,
    reviewCompletedAt,
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
    priorityCounts,
    updatedAt: now,
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
              priority: normalizePriority(
                taskSnapshot.priority ?? task.priority
              ),
              rank: normalizeRank(taskSnapshot.rank ?? task.rank),
              updatedAt: new Date().toISOString(),
            }
          : task
      )
    : [...tasks, taskSnapshot];

  return recalculateDailyRecord({
    ...record,
    tasks: nextTasks,
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

  const updatedRecord = upsertTaskToDailyRecord(
    currentRecord,
    taskSnapshot
  );

  return {
    ...dailyRecords,
    [dateKey]: updatedRecord,
  };
}

export function addTaskToDailyRecord(
  dailyRecords = {},
  dateKey,
  task
) {
  return updateDailyRecordTask(dailyRecords, dateKey, task, {
    completed: false,
    taskStatus: "pending",
    completedAt: null,
    priority: task.priority ?? "medium",
    rank: task.rank,
  });
}

export function updateTaskInDailyRecord(
  dailyRecords = {},
  dateKey,
  task
) {
  return updateDailyRecordTask(dailyRecords, dateKey, task, {
    taskStatus:
      task.completed
        ? "completed"
        : task.taskStatus ?? "pending",

    completed: task.completed ?? false,

    completedAt: task.completed
      ? task.completedAt ?? new Date().toISOString()
      : null,

    priority: task.priority ?? "medium",
    rank: task.rank,
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
    priority: task.priority ?? "medium",
    rank: task.rank,
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

    taskStatus:
      task.completed
        ? "completed"
        : task.taskStatus ?? "pending",

    completed: task.completed ?? false,

    priority: task.priority ?? "medium",
    rank: task.rank,
  });
}

export function markTaskDeletedInDailyRecord(
  dailyRecords = {},
  dateKey,
  task
) {
  return updateDailyRecordTask(dailyRecords, dateKey, task, {
    completed: false,
    taskStatus: "deleted",
    completedAt: null,
    priority: task.priority ?? "medium",
    rank: task.rank,
  });
}

export function confirmDailyRecord(
  dailyRecords = {},
  dateKey,
  reviewData = {}
) {
  const currentRecord = getOrCreateDailyRecord(
    dailyRecords,
    dateKey
  );

  const now = new Date().toISOString();

  const confirmedRecord = recalculateDailyRecord({
    ...currentRecord,

    forceDraft: false,

    status: "confirmed",
    reviewed: true,
    reviewedAt: now,
    confirmedAt: now,

    reviewCompleted: true,
    reviewCompletedAt: now,

    reflectionText:
      reviewData.reflectionText ??
      currentRecord.reflectionText ??
      "",

    mood: reviewData.mood ?? currentRecord.mood ?? null,
    energy: reviewData.energy ?? currentRecord.energy ?? null,
    dailyStyle:
      reviewData.dailyStyle ??
      currentRecord.dailyStyle ??
      null,

    updatedAt: now,
  });

  return {
    ...dailyRecords,
    [dateKey]: confirmedRecord,
  };
}

export function unconfirmDailyRecord(
  dailyRecords = {},
  dateKey
) {
  const currentRecord = getOrCreateDailyRecord(
    dailyRecords,
    dateKey
  );

  const draftRecord = recalculateDailyRecord({
    ...currentRecord,

    forceDraft: true,

    status: "draft",
    reviewed: false,
    reviewedAt: null,
    confirmedAt: null,

    reviewCompleted: false,
    reviewCompletedAt: null,

    updatedAt: new Date().toISOString(),
  });

  return {
    ...dailyRecords,
    [dateKey]: {
      ...draftRecord,
      forceDraft: false,
    },
  };
}

export function getDailyRecordList(dailyRecords = {}) {
  return Object.values(dailyRecords).sort((a, b) => {
    return a.date.localeCompare(b.date);
  });
}

export function getConfirmedDailyRecordList(
  dailyRecords = {}
) {
  return getDailyRecordList(dailyRecords).filter(
    (record) =>
      record.status === "confirmed" ||
      record.reviewCompleted === true
  );
}

export function syncDailyRecordFromTasks(
  dailyRecords = {},
  dateKey,
  tasks = []
) {
  const currentRecord = getOrCreateDailyRecord(
    dailyRecords,
    dateKey
  );

  const existingTasks = currentRecord.tasks ?? [];

  const existingById = new Map(
    existingTasks.map((task) => [task.id, task])
  );

  const syncedTasks = tasks.map((task, index) => {
    const existing = existingById.get(task.id);

    const taskStatus =
      task.taskStatus ??
      (
        task.completed
          ? "completed"
          : existing?.taskStatus === "completed" &&
            task.completed
            ? "completed"
            : "pending"
      );

    return createTaskSnapshot(task, {
      actualMinutes:
        task.actualMinutes ??
        task.workedMinutes ??
        task.focusMinutes ??
        existing?.actualMinutes ??
        0,

      actualSeconds:
        task.actualSeconds ??
        existing?.actualSeconds ??
        0,

      completed: taskStatus === "completed",

      taskStatus,

      completedAt:
        taskStatus === "completed"
          ? task.completedAt ??
            existing?.completedAt ??
            new Date().toISOString()
          : null,

      usedTimer:
        task.usedTimer ??
        existing?.usedTimer ??
        false,

      timerSessionCount:
        existing?.timerSessionCount ??
        task.timerSessionCount ??
        0,

      extensionCount:
        existing?.extensionCount ??
        task.extensionCount ??
        0,

      priority:
        task.priority ??
        existing?.priority ??
        "medium",

      rank:
        task.rank ??
        existing?.rank ??
        index + 1,
    });
  });

  const deletedTasks = existingTasks.filter(
    (task) =>
      task.taskStatus === "deleted" &&
      !tasks.some(
        (currentTask) => currentTask.id === task.id
      )
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