import type { ExtractedMessage, Logger } from "../types"

// Deduplicate extracted messages while warning on conflicting keys.
export function dedupeMessages(messages: ExtractedMessage[], logger: Logger): ExtractedMessage[] {
  const map = new Map<string, ExtractedMessage>()

  for (const message of messages) {
    if (!message.key || !message.source) continue
    const existing = map.get(message.key)
    if (!existing) {
      map.set(message.key, message)
      continue
    }
    if (existing.source !== message.source) {
      logger.warn(
        `Interceptor: duplicate key \"${message.key}\" with different source. Using first occurrence.`
      )
    }
  }

  return Array.from(map.values())
}

// Build a map that prefers default-locale values when present.
export function buildSourceMap(
  messages: ExtractedMessage[],
  sourceMessages: Record<string, string>
): Map<string, string> {
  const map = new Map<string, string>()

  for (const message of messages) {
    const existing = sourceMessages[message.key]
    if (existing && typeof existing === "string") {
      map.set(message.key, existing)
      continue
    }
    map.set(message.key, message.source)
  }

  return map
}
