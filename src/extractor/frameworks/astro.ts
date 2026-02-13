// Split Astro frontmatter from template markup.
export function extractAstroFrontmatter(
  content: string
): { frontmatter: string; template: string } {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/)
  if (!match) {
    return { frontmatter: "", template: content }
  }
  const frontmatter = match[1] ?? ""
  const template = content.slice(match[0].length)
  return { frontmatter, template }
}
