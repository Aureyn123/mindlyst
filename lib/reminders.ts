import { readJson, writeJson } from "./db";

export type Reminder = {
  id: string;
  noteId: string;
  userId: string;
  userEmail: string;
  noteTitle: string;
  noteText: string;
  reminderDate: number; // timestamp
  sent: boolean;
  createdAt: number;
};

const REMINDERS_FILE = "reminders.json";

export async function loadReminders(): Promise<Reminder[]> {
  return readJson<Reminder[]>(REMINDERS_FILE, []);
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await writeJson(REMINDERS_FILE, reminders);
}

export async function createReminder(reminder: Omit<Reminder, "id" | "createdAt" | "sent">): Promise<Reminder> {
  const reminders = await loadReminders();
  const newReminder: Reminder = {
    ...reminder,
    id: crypto.randomUUID(),
    sent: false,
    createdAt: Date.now()
  };
  reminders.push(newReminder);
  await saveReminders(reminders);
  return newReminder;
}

export async function getPendingReminders(): Promise<Reminder[]> {
  const reminders = await loadReminders();
  const now = Date.now();
  return reminders.filter(r => !r.sent && r.reminderDate <= now);
}

export async function markReminderAsSent(reminderId: string): Promise<void> {
  const reminders = await loadReminders();
  const reminder = reminders.find(r => r.id === reminderId);
  if (reminder) {
    reminder.sent = true;
    await saveReminders(reminders);
  }
}

export async function deleteReminder(reminderId: string): Promise<void> {
  const reminders = await loadReminders();
  const filtered = reminders.filter(r => r.id !== reminderId);
  await saveReminders(filtered);
}

export async function getUserReminders(userId: string): Promise<Reminder[]> {
  const reminders = await loadReminders();
  return reminders.filter(r => r.userId === userId && !r.sent);
}

