import fs from "node:fs/promises"
import path from "node:path"
import jiti from "jiti"
import type { InterceptorConfig } from "../types"
import { DEFAULT_CONFIG_NAMES } from "./defaults"

// Load a config file from disk, supporting JS/TS/JSON variants.
export async function loadConfig(
  explicitPath?: string,
  cwd: string = process.cwd()
): Promise<InterceptorConfig> {
  const configPath = explicitPath
    ? path.resolve(cwd, explicitPath)
    : await findConfigFile(cwd)

  if (!configPath) {
    throw new Error(
      `No interceptor config found. Create one of: ${DEFAULT_CONFIG_NAMES.join(", ")}`
    )
  }

  if (configPath.endsWith(".json")) {
    const raw = await fs.readFile(configPath, "utf8")
    return JSON.parse(raw) as InterceptorConfig
  }

  const loader = jiti(configPath, { interopDefault: true, esmResolve: true })
  const loaded = loader(configPath) as InterceptorConfig | { default: InterceptorConfig }
  return (loaded as { default?: InterceptorConfig }).default ?? (loaded as InterceptorConfig)
}

// Find the nearest config file walking up the directory tree.
async function findConfigFile(startDir: string): Promise<string | undefined> {
  let dir = path.resolve(startDir)

  while (true) {
    for (const name of DEFAULT_CONFIG_NAMES) {
      const candidate = path.join(dir, name)
      if (await exists(candidate)) {
        return candidate
      }
    }

    const parent = path.dirname(dir)
    if (parent === dir) {
      return undefined
    }
    dir = parent
  }
}

// Check whether a file exists.
async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
