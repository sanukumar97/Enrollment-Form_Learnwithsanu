import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl    = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendKey      = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromEmail      = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@learnwithsanu.com";
    const fromName       = Deno.env.get("RESEND_FROM_NAME") ?? "LearnWithSanu";

    // User client to verify admin status
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: adminCheck } = await userClient.rpc("is_admin");
    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      enrollmentId, to, toName, plan,
      sessionDate, sessionTime,
      templateBody, templateName,
      grantAccess, gmeetLink, existingLogId,
    } = await req.json() as {
      enrollmentId?: string;
      to: string;
      toName: string;
      plan: string;
      sessionDate?: string;
      sessionTime?: string;
      templateBody: string;
      templateName: string;
      grantAccess?: boolean;
      gmeetLink?: string;
      existingLogId?: string;
    };

    // Format helpers
    const fmtDate = (d?: string) => {
      if (!d) return "TBD";
      return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      });
    };
    const fmtTime = (t?: string) => {
      if (!t) return "TBD";
      const [h, m] = t.split(":");
      const hr = parseInt(h), ampm = hr >= 12 ? "PM" : "AM";
      return `${hr % 12 || 12}:${m} ${ampm}`;
    };

    // Variable substitution
    const body = templateBody
      .replace(/\{\{name\}\}/g,         toName          || "Student")
      .replace(/\{\{plan\}\}/g,         plan            || "")
      .replace(/\{\{session_date\}\}/g, fmtDate(sessionDate))
      .replace(/\{\{session_time\}\}/g, fmtTime(sessionTime))
      .replace(/\{\{gmeet_link\}\}/g,   gmeetLink       || "—");

    // Send via Resend
    let mailStatus: "Sent" | "Failed" = "Failed";
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to:   [to],
          subject: templateName,
          text:    body,
        }),
      });
      const resendJson = await resendRes.json().catch(() => ({}));
      if (resendRes.ok) {
        mailStatus = "Sent";
      } else {
        console.error("Resend rejected:", resendRes.status, JSON.stringify(resendJson));
      }
    } catch (e) {
      console.error("Resend fetch error:", e);
      mailStatus = "Failed";
    }

    // Service-role client for DB writes (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Update existing log row (Send Now flow) or insert a new one (fresh send)
    if (existingLogId) {
      await adminClient.from("mail_log").update({
        status:    mailStatus,
        sent_date: new Date().toISOString().split("T")[0],
      }).eq("id", existingLogId);
    } else {
      await adminClient.from("mail_log").insert({
        enrollment_id: enrollmentId ?? null,
        sent_to:       toName,
        email:         to,
        template:      templateName,
        sent_date:     new Date().toISOString().split("T")[0],
        status:        mailStatus,
      });
    }

    // Mark enrollment mail_sent only for custom mails (drives Bundle Access → Granted)
    if (mailStatus === "Sent" && enrollmentId && grantAccess) {
      await adminClient.from("enrollments").update({
        mail_sent:      true,
        mail_sent_date: new Date().toISOString(),
        template_used:  templateName,
      }).eq("id", enrollmentId);
    }

    return new Response(
      JSON.stringify({ success: mailStatus === "Sent", status: mailStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
