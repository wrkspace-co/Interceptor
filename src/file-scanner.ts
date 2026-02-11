import fg from "fast-glob";
import { NormalizedConfig } from "./types";

export async function scanFiles(normalized: NormalizedConfig): Promise<string[]> {
  return fg(normalized.include, {
    cwd: normalized.rootDir,
    absolute: true,
    ignore: normalized.exclude,
    onlyFiles: true,
    unique: true,
    dot: true
  });
}
