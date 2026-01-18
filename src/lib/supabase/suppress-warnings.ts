// src/lib/supabase/suppress-warnings.ts
/**
 * Temporary workaround for false-positive Supabase getSession() warnings
 * 
 * Background:
 * - Supabase SDK internal methods (like getAuthenticatorAssuranceLevel and database queries)
 *   automatically call getSession() internally
 * - This triggers warnings even though developers aren't directly calling it
 * - This is a known bug: https://github.com/supabase/supabase-js/issues/1010
 * 
 * This suppression is safe because:
 * 1. We ARE using getUser() in our auth guards (lib/auth/session.ts)
 * 2. The warnings come from internal Supabase methods, not our code
 * 3. Our middleware properly validates sessions with getUser()
 * 
 * Remove this file when Supabase fixes the upstream issue.
 */

// Store original console.warn
const originalWarn = console.warn;

// Supabase warning patterns to suppress
const SUPABASE_SESSION_WARNING_PATTERNS = [
  /Using the user object as returned from supabase\.auth\.getSession\(\)/i,
  /This value comes directly from the storage medium/i,
  /Use supabase\.auth\.getUser\(\) instead/i,
];

// Override console.warn to filter out Supabase false-positives
console.warn = function(...args: any[]) {
  const message = args.join(' ');
  
  // Check if this is a Supabase getSession warning
  const isSupabaseWarning = SUPABASE_SESSION_WARNING_PATTERNS.some(
    pattern => pattern.test(message)
  );
  
  // Only suppress if it's the Supabase warning
  if (!isSupabaseWarning) {
    originalWarn.apply(console, args);
  }
};

// Export a function to restore original console.warn if needed
export function restoreConsoleWarn() {
  console.warn = originalWarn;
}

// Export patterns for testing purposes
export { SUPABASE_SESSION_WARNING_PATTERNS };