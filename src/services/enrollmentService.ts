import { supabase } from "../lib/supabase";
import {
  getSessionToken,
  getStoredEnrollmentId,
  setStoredEnrollmentId,
} from "../lib/session";
import type { FormData } from "../app/components/enrollment/types";

export async function saveEnrollmentStep(step: number, form: FormData): Promise<string> {
  const sessionToken = getSessionToken();
  const enrollmentId = getStoredEnrollmentId();

  async function call(enrollmentId: string | null): Promise<string> {
    const { data, error } = await supabase.rpc("save_enrollment_step", {
      p_session_token: sessionToken,
      p_enrollment_id: enrollmentId,
      p_step: step,
      p_full_name: form.fullName || null,
      p_email: form.email,
      p_whatsapp: form.whatsapp || null,
      p_plan_slug: form.planId || null,
      p_utr_number: form.utrNumber || null,
      p_target_colleges: form.colleges.length ? form.colleges : null,
      p_referral_source: form.referralSource || null,
      p_referral_other: form.referralOther || null,
      p_remarks: form.remarks || null,
    });
    if (error) throw error;
    return data as string;
  }

  try {
    const id = await call(enrollmentId);
    setStoredEnrollmentId(id);
    return id;
  } catch (err) {
    const errorMsg =
      (typeof err === "object" && err && "message" in err
        ? String((err as Record<string, unknown>).message)
        : err instanceof Error
          ? err.message
          : JSON.stringify(err));

    console.error("[saveEnrollmentStep] error:", errorMsg);

    if (
      enrollmentId &&
      (errorMsg.toLowerCase().includes("not found") ||
        errorMsg.toLowerCase().includes("already submitted"))
    ) {
      sessionStorage.removeItem("enroll_id");
      setStoredEnrollmentId("");
      const id = await call(null);
      setStoredEnrollmentId(id);
      return id;
    }
    throw err;
  }
}

export async function submitEnrollment(): Promise<void> {
  const sessionToken = getSessionToken();
  const enrollmentId = getStoredEnrollmentId();
  if (!enrollmentId) {
    // If no enrollment ID, step save should have created one. Rebuild from session token.
    const { data } = await supabase
      .from("enrollments")
      .select("id")
      .eq("session_token", sessionToken)
      .eq("status", "in_progress")
      .maybeSingle();
    if (!data?.id) throw new Error("No enrollment in progress");
    setStoredEnrollmentId(data.id);
    await submitEnrollmentRpc(data.id, sessionToken);
    return;
  }
  await submitEnrollmentRpc(enrollmentId, sessionToken);
}

async function submitEnrollmentRpc(enrollmentId: string, sessionToken: string) {
  const { error } = await supabase.rpc("submit_enrollment", {
    p_session_token: sessionToken,
    p_enrollment_id: enrollmentId,
  });
  if (error) {
    if (
      error.message &&
      error.message.includes("DUPLICATE_SUBMISSION")
    ) {
      throw new Error("DUPLICATE_SUBMISSION");
    }
    if (
      error.message &&
      (error.message.toLowerCase().includes("not found") ||
        error.message.toLowerCase().includes("already submitted"))
    ) {
      sessionStorage.removeItem("enroll_id");
      setStoredEnrollmentId("");
      throw new Error("Enrollment not found. Please refresh and submit again.");
    }
    throw error;
  }
}
