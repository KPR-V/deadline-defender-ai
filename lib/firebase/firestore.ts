import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc as fbSetDoc,
  addDoc as fbAddDoc,
  updateDoc as fbUpdateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./client";
import { UserProfile } from "../../types/user";
import {
  Task,
  TaskStep,
  RiskSnapshot,
  FocusBlock,
  RescuePlan,
  BehaviorSignal,
  TaskCategory,
  TaskImportance,
  ProgressEvidence,
} from "../../types/task";
import { Reminder } from "../../types/reminder";

const removeUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Timestamp || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefined(value);
    }
  }
  return cleaned;
};

const setDoc = (ref: any, data: any, opts?: any) => opts ? fbSetDoc(ref, removeUndefined(data), opts) : fbSetDoc(ref, removeUndefined(data));
const addDoc = (ref: any, data: any) => fbAddDoc(ref, removeUndefined(data));
const updateDoc = (ref: any, data: any) => fbUpdateDoc(ref, removeUndefined(data));

// Helper to convert Firestore dates
const toDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val.toDate && typeof val.toDate === "function") return val.toDate();
  return new Date(val);
};

// USER PROFILE HELPERS
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const docRef = doc(db, "users", userId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    uid: userId,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as UserProfile;
}

export async function createUserProfile(
  userId: string,
  profile: Partial<UserProfile>,
): Promise<void> {
  const docRef = doc(db, "users", userId);
  const now = Timestamp.now();
  await setDoc(docRef, {
    displayName: profile.displayName || "",
    email: profile.email || "",
    timezone:
      profile.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC",
    workHours: profile.workHours || { start: "09:00", end: "22:00" },
    preferredFocusBlockMinutes: profile.preferredFocusBlockMinutes || 45,
    reminderIntensity: profile.reminderIntensity || "normal",
    productivityStyle: profile.productivityStyle || "flexible",
    defaultBufferPercentage: profile.defaultBufferPercentage || 15,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
): Promise<void> {
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// TASKS HELPERS
export async function getTasks(userId: string): Promise<Task[]> {
  const colRef = collection(db, "users", userId, "tasks");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      deadline: toDate(data.deadline),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as Task;
  });
}

export async function getTask(
  userId: string,
  taskId: string,
): Promise<Task | null> {
  const docRef = doc(db, "users", userId, "tasks", taskId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    deadline: toDate(data.deadline),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Task;
}

export async function createTask(
  userId: string,
  task: Omit<Task, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const colRef = collection(db, "users", userId, "tasks");
  const now = Timestamp.now();
  const deadlineTimestamp = Timestamp.fromDate(toDate(task.deadline));
  const docRef = await addDoc(colRef, {
    ...task,
    deadline: deadlineTimestamp,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateTask(
  userId: string,
  taskId: string,
  updates: Partial<Task>,
): Promise<void> {
  const docRef = doc(db, "users", userId, "tasks", taskId);
  const data: any = { ...updates, updatedAt: Timestamp.now() };
  if (updates.deadline) {
    data.deadline = Timestamp.fromDate(toDate(updates.deadline));
  }
  await updateDoc(docRef, data);
}

export async function deleteTask(
  userId: string,
  taskId: string,
): Promise<void> {
  const docRef = doc(db, "users", userId, "tasks", taskId);
  await deleteDoc(docRef);
}

// STEPS / SUBTASKS HELPERS
export async function getTaskSteps(
  userId: string,
  taskId: string,
): Promise<TaskStep[]> {
  const colRef = collection(db, "users", userId, "tasks", taskId, "steps");
  const q = query(colRef, orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      taskId,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as TaskStep;
  });
}

export async function createTaskStep(
  userId: string,
  taskId: string,
  step: Omit<TaskStep, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const colRef = collection(db, "users", userId, "tasks", taskId, "steps");
  const now = Timestamp.now();
  const docRef = await addDoc(colRef, {
    ...step,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateTaskStep(
  userId: string,
  taskId: string,
  stepId: string,
  updates: Partial<TaskStep>,
): Promise<void> {
  const docRef = doc(db, "users", userId, "tasks", taskId, "steps", stepId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function saveTaskStepsBatch(
  userId: string,
  taskId: string,
  steps: Omit<TaskStep, "id" | "taskId" | "createdAt" | "updatedAt">[],
): Promise<void> {
  const colRef = collection(db, "users", userId, "tasks", taskId, "steps");
  const batch = writeBatch(db);
  const now = Timestamp.now();

  steps.forEach((step) => {
    const docRef = doc(colRef);
    batch.set(docRef, {
      ...step,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
}

// RISK SNAPSHOTS
export async function getRiskSnapshots(
  userId: string,
  taskId: string,
): Promise<RiskSnapshot[]> {
  const colRef = collection(
    db,
    "users",
    userId,
    "tasks",
    taskId,
    "riskSnapshots",
  );
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      taskId,
      createdAt: toDate(data.createdAt),
    } as RiskSnapshot;
  });
}

export async function addRiskSnapshot(
  userId: string,
  taskId: string,
  snapshot: Omit<RiskSnapshot, "id" | "createdAt">,
): Promise<string> {
  const colRef = collection(
    db,
    "users",
    userId,
    "tasks",
    taskId,
    "riskSnapshots",
  );
  const docRef = await addDoc(colRef, {
    ...snapshot,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

// FOCUS BLOCKS
export async function getFocusBlocks(
  userId: string,
  taskId: string,
): Promise<FocusBlock[]> {
  const colRef = collection(
    db,
    "users",
    userId,
    "tasks",
    taskId,
    "focusBlocks",
  );
  const q = query(colRef, orderBy("start", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      taskId,
      start: toDate(data.start),
      end: toDate(data.end),
      createdAt: toDate(data.createdAt),
    } as FocusBlock;
  });
}

// PROGRESS EVIDENCE
export async function addProgressEvidence(
  userId: string,
  taskId: string,
  type: ProgressEvidence["type"],
  description: string,
): Promise<string> {
  const colRef = collection(
    db,
    "users",
    userId,
    "tasks",
    taskId,
    "progressEvidence",
  );
  const docRef = await addDoc(colRef, {
    type,
    description,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getProgressEvidenceList(
  userId: string,
  taskId: string,
): Promise<ProgressEvidence[]> {
  const colRef = collection(
    db,
    "users",
    userId,
    "tasks",
    taskId,
    "progressEvidence",
  );
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: toDate(data.createdAt),
    } as ProgressEvidence;
  });
}

export async function saveFocusBlocksBatch(
  userId: string,
  taskId: string,
  blocks: Omit<FocusBlock, "id" | "taskId" | "createdAt">[],
): Promise<void> {
  const colRef = collection(
    db,
    "users",
    userId,
    "tasks",
    taskId,
    "focusBlocks",
  );
  const batch = writeBatch(db);
  const now = Timestamp.now();

  blocks.forEach((block) => {
    const docRef = doc(colRef);
    batch.set(docRef, {
      ...block,
      start: Timestamp.fromDate(toDate(block.start)),
      end: Timestamp.fromDate(toDate(block.end)),
      createdAt: now,
    });
  });

  await batch.commit();
}

export async function updateFocusBlock(
  userId: string,
  taskId: string,
  blockId: string,
  updates: Partial<FocusBlock>,
): Promise<void> {
  const docRef = doc(
    db,
    "users",
    userId,
    "tasks",
    taskId,
    "focusBlocks",
    blockId,
  );
  const data: any = { ...updates };
  if (updates.start) data.start = Timestamp.fromDate(toDate(updates.start));
  if (updates.end) data.end = Timestamp.fromDate(toDate(updates.end));
  await updateDoc(docRef, data);
}

// RESCUE PLAN HELPERS
export async function getRescuePlan(
  userId: string,
  taskId: string,
): Promise<RescuePlan | null> {
  const colRef = collection(
    db,
    "users",
    userId,
    "tasks",
    taskId,
    "rescuePlans",
  );
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    ...data,
    id: d.id,
    taskId,
    createdAt: toDate(data.createdAt),
  } as RescuePlan;
}

export async function saveRescuePlan(
  userId: string,
  taskId: string,
  plan: Omit<RescuePlan, "id" | "taskId" | "createdAt">,
): Promise<string> {
  const colRef = collection(
    db,
    "users",
    userId,
    "tasks",
    taskId,
    "rescuePlans",
  );
  const docRef = await addDoc(colRef, {
    ...plan,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

// BEHAVIOR SIGNALS
export async function addBehaviorSignal(
  userId: string,
  signal: Omit<BehaviorSignal, "id" | "createdAt">,
): Promise<string> {
  const colRef = collection(db, "users", userId, "behaviorSignals");
  const docRef = await addDoc(colRef, {
    ...signal,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getBehaviorSignals(
  userId: string,
): Promise<BehaviorSignal[]> {
  const colRef = collection(db, "users", userId, "behaviorSignals");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: toDate(data.createdAt),
    } as BehaviorSignal;
  });
}

// REMINDERS (Stored in users/{userId}/notifications/{notificationId})
export async function createReminder(
  userId: string,
  reminder: Omit<Reminder, "id" | "createdAt">,
): Promise<string> {
  const colRef = collection(db, "users", userId, "notifications");
  const docRef = await addDoc(colRef, {
    ...reminder,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getReminders(userId: string): Promise<Reminder[]> {
  const colRef = collection(db, "users", userId, "notifications");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: toDate(data.createdAt),
      readAt: data.readAt ? toDate(data.readAt) : undefined,
    } as Reminder;
  });
}

export async function updateReminder(
  userId: string,
  reminderId: string,
  updates: Partial<Reminder>,
): Promise<void> {
  const docRef = doc(db, "users", userId, "notifications", reminderId);
  const data: any = { ...updates };
  if (updates.readAt) data.readAt = Timestamp.fromDate(toDate(updates.readAt));
  await updateDoc(docRef, data);
}

// FCM USER DEVICES
export interface UserDevice {
  fcmToken: string;
  userAgent: string;
  updatedAt: any;
}

export async function saveUserDevice(
  userId: string,
  deviceId: string,
  fcmToken: string,
): Promise<void> {
  const docRef = doc(db, "users", userId, "devices", deviceId);
  await setDoc(
    docRef,
    {
      fcmToken,
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "server",
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}

export async function getUserDevices(userId: string): Promise<{ deviceId: string; fcmToken: string }[]> {
  const colRef = collection(db, "users", userId, "devices");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({
    deviceId: d.id,
    fcmToken: d.data().fcmToken,
  }));
}
