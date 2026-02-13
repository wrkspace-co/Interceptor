import path from "node:path"
import type { NormalizedConfig } from "../types"

// Resolve the messages file for a locale.
export function resolveMessagesFile(config: NormalizedConfig, locale: string): string {
  if (config.i18n.resolveMessagesFile) {
    return path.resolve(config.rootDir, config.i18n.resolveMessagesFile(locale))
  }

  const messagesPath = config.i18n.messagesPath
    ? config.i18n.messagesPath
    : path.join(config.i18n.messagesDir, config.i18n.localeFilePattern)

  const resolved = messagesPath.replace("{locale}", locale)
  return path.resolve(config.rootDir, resolved)
}
