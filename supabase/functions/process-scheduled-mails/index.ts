import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fmtDate = (d?: string | null) => {
  if (!d) return "TBD";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
};
const fmtTime = (t?: string | null) => {
  if (!t) return "TBD";
  const [h, m] = t.split(":");
  const hr = parseInt(h), ampm = hr >= 12 ? "PM" : "AM";
  return `${hr % 12 || 12}:${m} ${ampm}`;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl    = Deno.env.get("SUPABASE_URL")             ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendKey      = Deno.env.get("RESEND_API_KEY")            ?? "";
  const fromEmail      = Deno.env.get("RESEND_FROM_EMAIL")         ?? "noreply@learnwithsanu.com";
  const fromName       = Deno.env.get("RESEND_FROM_NAME")          ?? "LearnWithSanu";
  const cronSecret     = Deno.env.get("CRON_SECRET")               ?? "";

  // Validate the custom cron secret header (replaces JWT auth)
  const incomingSecret = req.headers.get("x-cron-secret") ?? "";
  if (incomingSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("resendKey set:", !!resendKey, "fromEmail:", fromEmail);
  console.log("supabaseUrl set:", !!supabaseUrl, "serviceRoleKey set:", !!serviceRoleKey);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const nowIso = new Date().toISOString();
  console.log("querying mail_log, now:", nowIso);

  // 1. Find all scheduled mails that are due now
  const { data: dueRows, error: dueErr } = await admin
    .from("mail_log")
    .select("*")
    .eq("status", "Scheduled")
    .lte("scheduled_for", nowIso);

  console.log("dueRows count:", dueRows?.length ?? 0, "dueErr:", dueErr?.message ?? null);

  if (dueErr) {
    return new Response(JSON.stringify({ error: dueErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!dueRows || dueRows.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Fetch all active templates once
  const { data: templates } = await admin
    .from("email_templates")
    .select("name, body")
    .eq("archived", false);

  let processed = 0;

  for (const row of dueRows) {
    // Use stored body (bundle mails) or fall back to template lookup
    const tpl = (templates ?? []).find((t: { name: string; body: string }) => t.name === row.template);
    const rawBody: string | null = row.body ?? tpl?.body ?? null;
    if (!rawBody) {
      await admin.from("mail_log").update({ status: "Failed" }).eq("id", row.id);
      continue;
    }

    // 3. Fetch enrollment for session data (if linked)
    let sessionDate: string | null = null;
    let sessionTime: string | null = null;
    let planName = "";
    if (row.enrollment_id) {
      const { data: enroll } = await admin
        .from("enrollments")
        .select("plan_name_snapshot, session_date, session_time")
        .eq("id", row.enrollment_id)
        .single();
      if (enroll) {
        sessionDate = enroll.session_date ?? null;
        sessionTime = enroll.session_time ?? null;
        planName    = enroll.plan_name_snapshot ?? "";
      }
    }

    // 4. Substitute variables
    const body = rawBody
      .replace(/\{\{name\}\}/g,         row.sent_to   || "Student")
      .replace(/\{\{plan\}\}/g,         planName      || "")
      .replace(/\{\{session_date\}\}/g, fmtDate(sessionDate))
      .replace(/\{\{session_time\}\}/g, fmtTime(sessionTime));

    // 5. Send via Resend
    let mailStatus: "Sent" | "Failed" = "Failed";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:    `${fromName} <${fromEmail}>`,
          to:      [row.email],
          subject: row.template,
          text:    body,
        }),
      });
      const resendBody = await res.json().catch(() => ({}));
      if (res.ok) {
        mailStatus = "Sent";
      } else {
        console.error(`Resend error for ${row.email}: ${res.status}`, JSON.stringify(resendBody));
      }
    } catch (e) {
      console.error(`Fetch error for ${row.email}:`, e);
      mailStatus = "Failed";
    }

    // 6. Update mail_log row in-place (don't insert a new one)
    await admin.from("mail_log").update({
      status:    mailStatus,
      sent_date: new Date().toISOString().split("T")[0],
    }).eq("id", row.id);

    // Grant Bundle Access on enrollment when a bundle scheduled mail is sent successfully
    if (mailStatus === "Sent" && row.enrollment_id && row.template?.startsWith("Bundle:")) {
      await admin.from("enrollments").update({
        mail_sent:      true,
        mail_sent_date: new Date().toISOString(),
      }).eq("id", row.enrollment_id);
    }

    processed++;
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
