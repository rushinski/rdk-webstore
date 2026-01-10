// src/lib/validation/password.ts
export interface PasswordRequirementState {
  minLength: boolean;
  notRepeatedChar: boolean;
}

const REPEAT_THRESHOLD = 0.6;
const RUN_THRESHOLD = 0.5;
const LONG_PASSWORD_THRESHOLD = 32;
const LONG_REPEAT_THRESHOLD = 0.95;
const LONG_RUN_THRESHOLD = 0.95;

const hasRepeatingPattern = (password: string): boolean => {
  const length = password.length;
  for (let size = 3; size <= Math.floor(length / 2); size += 1) {
    if (length % size !== 0) continue;
    const chunk = password.slice(0, size);
    if (chunk.repeat(length / size) === password) {
      return true;
    }
  }
  return false;
};

export function evaluatePasswordRequirements(password: string): PasswordRequirementState {
  const safe = typeof password === "string" ? password : "";
  const length = safe.length;

  if (length === 0) {
    return { minLength: false, notRepeatedChar: false };
  }

  const counts: Record<string, number> = {};
  let maxCount = 0;
  let maxRun = 0;
  let currentRun = 0;
  let lastChar = "";
  for (const char of safe) {
    counts[char] = (counts[char] ?? 0) + 1;
    if (counts[char] > maxCount) maxCount = counts[char];

    if (char === lastChar) {
      currentRun += 1;
    } else {
      currentRun = 1;
      lastChar = char;
    }
    if (currentRun > maxRun) maxRun = currentRun;
  }

  const repeatRatio = maxCount / length;
  const runRatio = maxRun / length;
  const repeatThreshold = length >= LONG_PASSWORD_THRESHOLD ? LONG_REPEAT_THRESHOLD : REPEAT_THRESHOLD;
  const runThreshold = length >= LONG_PASSWORD_THRESHOLD ? LONG_RUN_THRESHOLD : RUN_THRESHOLD;

  return {
    minLength: length >= 8,
    notRepeatedChar: repeatRatio < repeatThreshold && runRatio < runThreshold,
  };
}

export function isPasswordValid(password: string): boolean {
  if (typeof password !== "string") return false;
  if (password.trim().length === 0) return false;

  const req = evaluatePasswordRequirements(password);
  return req.minLength && req.notRepeatedChar && !hasRepeatingPattern(password);
}
