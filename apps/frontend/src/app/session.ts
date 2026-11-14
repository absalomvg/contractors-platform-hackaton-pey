/* The onboarding record id acts as the user: there is no auth yet. Storage can
 * throw (private mode, blocked site data), so every access is guarded. */
const SESSION_KEY = 'contractors-platform.contractorId';

export function readSession(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSession(contractorId: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, contractorId);
  } catch {
    /* The dashboard URL still works without storage. */
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* Nothing to clear. */
  }
}
