// Parse an LLM response into a JSON array.
export function sanitizeJsonArray(raw: string): any[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error("Empty response from LLM.")
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) {
      throw new Error("LLM response is not a JSON array.")
    }
    return parsed
  } catch {
    const start = trimmed.indexOf("[")
    const end = trimmed.lastIndexOf("]")
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Unable to parse LLM response as JSON array.")
    }
    const sliced = trimmed.slice(start, end + 1)
    const parsed = JSON.parse(sliced)
    if (!Array.isArray(parsed)) {
      throw new Error("LLM response is not a JSON array.")
    }
    return parsed
  }
}
