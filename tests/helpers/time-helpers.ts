// tests/helpers/time-helpers.ts
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

export function mockDate(date: Date): () => void {
  const originalDate = Date;
  const mockedDate = date;
  
  global.Date = class extends originalDate {
    constructor() {
      super();
      return mockedDate;
    }
    
    static now() {
      return mockedDate.getTime();
    }
  } as any;
  
  return () => {
    global.Date = originalDate;
  };
}
