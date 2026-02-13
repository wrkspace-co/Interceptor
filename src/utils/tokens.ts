// Estimate token usage based on string length.
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

// Estimate token usage for an array of strings.
export function estimateTokensForStrings(strings: string[]): number {
  return strings.reduce((sum, value) => sum + estimateTokens(value), 0)
}
