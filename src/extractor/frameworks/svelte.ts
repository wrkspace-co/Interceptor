// Extract <script> blocks from Svelte files.
export function extractSvelteScriptBlocks(content: string): string[] {
  const blocks = Array.from(
    content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)
  )
  return blocks.map((match) => match[1])
}

// Remove <script> blocks so template expressions can be scanned.
export function stripSvelteScriptBlocks(content: string): string {
  return content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
}
