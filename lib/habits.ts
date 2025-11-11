// Gestion des habitudes quotidiennes
import { readJson, writeJson } from "./db";

export type HabitStatus = "completed" | "skipped" | "pending";

export type DailyHabitRecord = {
  date: string; // Format: YYYY-MM-DD
  status: HabitStatus;
  completedAt?: number; // Timestamp si complétée
};

export type Habit = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string; // Couleur optionnelle pour l'habitude
  dailyRecords: DailyHabitRecord[]; // Historique des jours
  createdAt: number;
  updatedAt: number;
};

const HABITS_FILE = "habits.json";

async function loadHabits(): Promise<Habit[]> {
  return readJson<Habit[]>(HABITS_FILE, []);
}

async function saveHabits(habits: Habit[]): Promise<void> {
  await writeJson(HABITS_FILE, habits);
}

// Obtenir la date du jour au format YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Obtenir la date d'hier
export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
}

// Réinitialiser toutes les habitudes pour le nouveau jour
export async function resetDailyHabits(): Promise<void> {
  const habits = await loadHabits();
  const today = getTodayDateString();
  
  for (const habit of habits) {
    // Vérifier si on a déjà un enregistrement pour aujourd'hui
    const todayRecord = habit.dailyRecords.find((r) => r.date === today);
    if (!todayRecord) {
      // Ajouter un enregistrement "pending" pour aujourd'hui
      habit.dailyRecords.push({
        date: today,
        status: "pending",
      });
      habit.updatedAt = Date.now();
    }
  }
  
  await saveHabits(habits);
}

export async function getUserHabits(userId: string): Promise<Habit[]> {
  const habits = await loadHabits();
  // S'assurer que chaque habitude a un enregistrement pour aujourd'hui
  const today = getTodayDateString();
  let needsSave = false;
  
  for (const habit of habits.filter((h) => h.userId === userId)) {
    const todayRecord = habit.dailyRecords.find((r) => r.date === today);
    if (!todayRecord) {
      habit.dailyRecords.push({
        date: today,
        status: "pending",
      });
      habit.updatedAt = Date.now();
      needsSave = true;
    }
  }
  
  if (needsSave) {
    await saveHabits(habits);
  }
  
  return habits.filter((h) => h.userId === userId);
}

export async function createHabit(userId: string, name: string, description?: string, color?: string): Promise<Habit> {
  const habits = await loadHabits();
  const today = getTodayDateString();
  
  const newHabit: Habit = {
    id: crypto.randomUUID(),
    userId,
    name: name.trim(),
    description: description?.trim(),
    color: color || "blue",
    dailyRecords: [
      {
        date: today,
        status: "pending",
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  habits.push(newHabit);
  await saveHabits(habits);
  return newHabit;
}

export async function updateHabitStatus(
  habitId: string,
  userId: string,
  date: string,
  status: HabitStatus
): Promise<Habit | null> {
  const habits = await loadHabits();
  const habit = habits.find((h) => h.id === habitId && h.userId === userId);
  if (!habit) {
    return null;
  }
  
  const record = habit.dailyRecords.find((r) => r.date === date);
  if (record) {
    record.status = status;
    if (status === "completed") {
      record.completedAt = Date.now();
    } else {
      delete record.completedAt;
    }
  } else {
    habit.dailyRecords.push({
      date,
      status,
      completedAt: status === "completed" ? Date.now() : undefined,
    });
  }
  
  habit.updatedAt = Date.now();
  await saveHabits(habits);
  return habit;
}

export async function updateHabit(
  habitId: string,
  userId: string,
  updates: { name?: string; description?: string; color?: string }
): Promise<Habit | null> {
  const habits = await loadHabits();
  const habit = habits.find((h) => h.id === habitId && h.userId === userId);
  if (!habit) {
    return null;
  }
  
  if (updates.name !== undefined) {
    habit.name = updates.name.trim();
  }
  if (updates.description !== undefined) {
    habit.description = updates.description?.trim();
  }
  if (updates.color !== undefined) {
    habit.color = updates.color;
  }
  
  habit.updatedAt = Date.now();
  await saveHabits(habits);
  return habit;
}

export async function deleteHabit(habitId: string, userId: string): Promise<boolean> {
  const habits = await loadHabits();
  const initialLength = habits.length;
  const filtered = habits.filter((h) => !(h.id === habitId && h.userId === userId));
  if (filtered.length === initialLength) {
    return false;
  }
  await saveHabits(filtered);
  return true;
}

// Calculer le pourcentage de réussite pour une semaine
export function calculateWeeklySuccessRate(habit: Habit, weekStartDate?: Date): number {
  const start = weekStartDate || new Date();
  start.setDate(start.getDate() - start.getDay()); // Début de semaine (dimanche)
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Fin de semaine (samedi)
  end.setHours(23, 59, 59, 999);
  
  // Filtrer les enregistrements de la semaine
  const weekRecords = habit.dailyRecords.filter((record) => {
    const recordDate = new Date(record.date + "T00:00:00");
    return recordDate >= start && recordDate <= end;
  });
  
  if (weekRecords.length === 0) return 0;
  
  const completed = weekRecords.filter((r) => r.status === "completed").length;
  return Math.round((completed / weekRecords.length) * 100);
}

// Obtenir les statistiques de la semaine en cours
export function getWeeklyStats(habits: Habit[]): {
  totalHabits: number;
  averageSuccessRate: number;
  habitsStats: Array<{ habitId: string; habitName: string; successRate: number }>;
} {
  if (habits.length === 0) {
    return {
      totalHabits: 0,
      averageSuccessRate: 0,
      habitsStats: [],
    };
  }
  
  const habitsStats = habits.map((habit) => ({
    habitId: habit.id,
    habitName: habit.name,
    successRate: calculateWeeklySuccessRate(habit),
  }));
  
  const totalSuccessRate = habitsStats.reduce((sum, stat) => sum + stat.successRate, 0);
  const averageSuccessRate = Math.round(totalSuccessRate / habits.length);
  
  return {
    totalHabits: habits.length,
    averageSuccessRate,
    habitsStats,
  };
}

