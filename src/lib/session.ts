const SESSION_KEY = "enroll_session";
export const ENROLLMENT_ID_KEY = "enroll_id";

/** Browser session token — no Supabase login required for public form users. */
export function getSessionToken(): string {
  let token = sessionStorage.getItem(SESSION_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, token);
  }
  return token;
}

export function getStoredEnrollmentId(): string | null {
  return sessionStorage.getItem(ENROLLMENT_ID_KEY);
}

export function setStoredEnrollmentId(id: string) {
  sessionStorage.setItem(ENROLLMENT_ID_KEY, id);
}

export function clearEnrollmentSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(ENROLLMENT_ID_KEY);
  sessionStorage.removeItem("enroll_v3");
}
