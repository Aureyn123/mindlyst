import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

type JsonValue = Record<string, unknown> | unknown[];

async function ensureFile(file: string, defaultContent: JsonValue): Promise<void> {
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(defaultContent, null, 2), "utf8");
  }
}

export async function readJson<T>(relativePath: string, defaultContent: JsonValue): Promise<T> {
  const absolute = path.join(DATA_DIR, relativePath);
  await ensureFile(absolute, defaultContent);
  const raw = await fs.readFile(absolute, "utf8");
  return JSON.parse(raw) as T;
}

export async function writeJson(relativePath: string, data: JsonValue): Promise<void> {
  const absolute = path.join(DATA_DIR, relativePath);
  await ensureFile(absolute, data);
  await fs.writeFile(absolute, JSON.stringify(data, null, 2), "utf8");
}

