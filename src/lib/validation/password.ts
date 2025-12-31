export interface PasswordRequirementState {
  minLength: boolean;
  notRepeatedChar: boolean;
}

export function evaluatePasswordRequirements(password: string): PasswordRequirementState {
  const repeated = password.length > 0 && password.split("").every((c) => c === password[0]);

  return {
    minLength: password.length >= 8,
    notRepeatedChar: !repeated,
  };
}

export function isPasswordValid(password: string): boolean {
  const req = evaluatePasswordRequirements(password);
  return req.minLength && req.notRepeatedChar;
}
