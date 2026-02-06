import fs from "node:fs/promises";
import path from "node:path";

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readJsonFile(filePath: string): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function writeJsonFile(
  filePath: string,
  data: Record<string, string>
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const sorted = sortObjectKeys(data);
  const content = JSON.stringify(sorted, null, 2) + "\n";
  await fs.writeFile(filePath, content, "utf8");
}

export function sortObjectKeys(
  data: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]))
  );
}

export function sanitizeJsonArray(raw: string): any[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Empty response from LLM.");
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error("LLM response is not a JSON array.");
    }
    return parsed;
  } catch {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Unable to parse LLM response as JSON array.");
    }
    const sliced = trimmed.slice(start, end + 1);
    const parsed = JSON.parse(sliced);
    if (!Array.isArray(parsed)) {
      throw new Error("LLM response is not a JSON array.");
    }
    return parsed;
  }
}
