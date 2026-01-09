// tests/helpers/performance-helpers.ts
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  return { result, duration };
}

export async function measureAverageTime<T>(
  fn: () => Promise<T>,
  iterations: number = 10
): Promise<number> {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureExecutionTime(fn);
    times.push(duration);
  }
  
  return times.reduce((a, b) => a + b, 0) / times.length;
}

export function expectReasonableResponseTime(duration: number, maxMs: number = 1000) {
  expect(duration).toBeLessThan(maxMs);
}

export async function runConcurrently<T>(
  fn: () => Promise<T>,
  count: number
): Promise<T[]> {
  const promises = Array.from({ length: count }, () => fn());
  return Promise.all(promises);
}