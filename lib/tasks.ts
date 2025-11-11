// Gestion des tâches (todos)
import { readJson, writeJson } from "./db";

export type TaskStatus = "pending" | "completed" | "cancelled";

export type SubTask = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
};

export type Task = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  subTasks: SubTask[]; // Liste des sous-tâches
  createdAt: number;
  updatedAt: number;
};

const TASKS_FILE = "tasks.json";

async function loadTasks(): Promise<Task[]> {
  return readJson<Task[]>(TASKS_FILE, []);
}

async function saveTasks(tasks: Task[]): Promise<void> {
  await writeJson(TASKS_FILE, tasks);
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  const tasks = await loadTasks();
  return tasks.filter((t) => t.userId === userId);
}

export async function createTask(
  userId: string,
  title: string,
  description?: string,
  subTasks?: string[]
): Promise<Task> {
  const tasks = await loadTasks();
  const newTask: Task = {
    id: crypto.randomUUID(),
    userId,
    title: title.trim(),
    description: description?.trim(),
    status: "pending",
    subTasks: subTasks
      ? subTasks.map((text) => ({
          id: crypto.randomUUID(),
          text: text.trim(),
          completed: false,
          createdAt: Date.now(),
        }))
      : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  tasks.push(newTask);
  await saveTasks(tasks);
  return newTask;
}

export async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: TaskStatus
): Promise<Task | null> {
  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === taskId && t.userId === userId);
  if (!task) {
    return null;
  }
  task.status = status;
  task.updatedAt = Date.now();
  await saveTasks(tasks);
  return task;
}

export async function updateTask(
  taskId: string,
  userId: string,
  updates: { title?: string; description?: string }
): Promise<Task | null> {
  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === taskId && t.userId === userId);
  if (!task) {
    return null;
  }
  if (updates.title !== undefined) {
    task.title = updates.title.trim();
  }
  if (updates.description !== undefined) {
    task.description = updates.description?.trim();
  }
  task.updatedAt = Date.now();
  await saveTasks(tasks);
  return task;
}

export async function deleteTask(taskId: string, userId: string): Promise<boolean> {
  const tasks = await loadTasks();
  const initialLength = tasks.length;
  const filtered = tasks.filter((t) => !(t.id === taskId && t.userId === userId));
  if (filtered.length === initialLength) {
    return false;
  }
  await saveTasks(filtered);
  return true;
}

export function calculateTaskCompletionRate(task: Task): number {
  if (task.subTasks.length === 0) {
    // Si pas de sous-tâches, utiliser le statut principal
    return task.status === "completed" ? 100 : 0;
  }
  const completedSubTasks = task.subTasks.filter((st) => st.completed).length;
  return Math.round((completedSubTasks / task.subTasks.length) * 100);
}

export function calculateCompletionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  
  // Calculer le pourcentage moyen basé sur les sous-tâches
  let totalPercentage = 0;
  for (const task of tasks) {
    totalPercentage += calculateTaskCompletionRate(task);
  }
  return Math.round(totalPercentage / tasks.length);
}

export async function addSubTask(taskId: string, userId: string, subTaskText: string): Promise<Task | null> {
  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === taskId && t.userId === userId);
  if (!task) {
    return null;
  }
  
  const newSubTask: SubTask = {
    id: crypto.randomUUID(),
    text: subTaskText.trim(),
    completed: false,
    createdAt: Date.now(),
  };
  
  task.subTasks.push(newSubTask);
  task.updatedAt = Date.now();
  
  // Mettre à jour le statut principal si toutes les sous-tâches sont complétées
  if (task.subTasks.length > 0 && task.subTasks.every((st) => st.completed)) {
    task.status = "completed";
  }
  
  await saveTasks(tasks);
  return task;
}

export async function toggleSubTask(taskId: string, userId: string, subTaskId: string): Promise<Task | null> {
  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === taskId && t.userId === userId);
  if (!task) {
    return null;
  }
  
  const subTask = task.subTasks.find((st) => st.id === subTaskId);
  if (!subTask) {
    return null;
  }
  
  subTask.completed = !subTask.completed;
  task.updatedAt = Date.now();
  
  // Mettre à jour le statut principal
  if (task.subTasks.length > 0 && task.subTasks.every((st) => st.completed)) {
    task.status = "completed";
  } else if (task.status === "completed") {
    task.status = "pending";
  }
  
  await saveTasks(tasks);
  return task;
}

export async function deleteSubTask(taskId: string, userId: string, subTaskId: string): Promise<Task | null> {
  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === taskId && t.userId === userId);
  if (!task) {
    return null;
  }
  
  task.subTasks = task.subTasks.filter((st) => st.id !== subTaskId);
  task.updatedAt = Date.now();
  
  // Mettre à jour le statut principal
  if (task.subTasks.length > 0 && task.subTasks.every((st) => st.completed)) {
    task.status = "completed";
  } else if (task.status === "completed") {
    task.status = "pending";
  }
  
  await saveTasks(tasks);
  return task;
}

export async function updateSubTask(
  taskId: string,
  userId: string,
  subTaskId: string,
  newText: string
): Promise<Task | null> {
  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === taskId && t.userId === userId);
  if (!task) {
    return null;
  }
  
  const subTask = task.subTasks.find((st) => st.id === subTaskId);
  if (!subTask) {
    return null;
  }
  
  subTask.text = newText.trim();
  task.updatedAt = Date.now();
  await saveTasks(tasks);
  return task;
}

