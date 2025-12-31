export interface PasswordRequirementState {
  minLength: boolean;
  hasLetter: boolean;
  hasNumberOrSymbol: boolean;
  notRepeatedChar: boolean;
}

export function evaluatePasswordRequirements(password: string): PasswordRequirementState {
  const repeated = password.length > 0 && password.split("").every((c) => c === password[0]);

  return {
    minLength: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumberOrSymbol: /[\d\W]/.test(password),
    notRepeatedChar: !repeated,
  };
}

export function isPasswordValid(password: string): boolean {
  const req = evaluatePasswordRequirements(password);
  return req.minLength && req.hasLetter && req.hasNumberOrSymbol && req.notRepeatedChar;
}
