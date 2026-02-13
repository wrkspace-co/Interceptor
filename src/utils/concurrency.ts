// Run async tasks with a concurrency limit.
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  if (tasks.length === 0) return []
  const concurrency = Math.max(1, limit || 1)
  const results: T[] = new Array(tasks.length)
  let nextIndex = 0

  const worker = async () => {
    while (true) {
      const current = nextIndex
      if (current >= tasks.length) return
      nextIndex += 1
      results[current] = await tasks[current]()
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  )
  await Promise.all(workers)
  return results
}
