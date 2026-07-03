export async function timedQuery<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const ms = Date.now() - start;
    if (ms > 1000) {
      console.error(`[catalog] SLOW ${name} ${ms}ms`);
    } else if (ms > 500) {
      console.warn(`[catalog] slow ${name} ${ms}ms`);
    }
  }
}
