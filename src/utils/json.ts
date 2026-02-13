import fs from "node:fs/promises"
import path from "node:path"

// Read a JSON file into a string map.
export async function readJsonFile(filePath: string): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    const parsed = JSON.parse(raw) as Record<string, string>
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    return parsed
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return {}
    }
    throw error
  }
}

// Write a JSON file with stable key ordering.
export async function writeJsonFile(
  filePath: string,
  data: Record<string, string>
): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  const sorted = sortObjectKeys(data)
  const content = JSON.stringify(sorted, null, 2) + "\n"
  await fs.writeFile(filePath, content, "utf8")
}

// Sort object keys for deterministic output.
export function sortObjectKeys(data: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]))
  )
}
