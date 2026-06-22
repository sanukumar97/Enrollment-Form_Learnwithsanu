import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Mail, Phone, ChevronLeft, Check, Copy,
  Clipboard, Loader2, MessageCircle, ShieldCheck,
  AlertCircle, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  FormData, Plan, IIT_OPTIONS, REFERRAL_OPTIONS,
} from "./types";
import { fetchActivePlans } from "../../../services/planService";
import { fetchPaymentSettings, type PaymentSettings } from "../../../services/paymentSettingsService";
import { saveEnrollmentStep, submitEnrollment } from "../../../services/enrollmentService";
import { clearEnrollmentSession } from "../../../lib/session";
import { fetchBannerSettings, type BannerSettings } from "../../../services/bannerService";

const PRIMARY = "#132BFC";

const INITIAL: FormData = {
  fullName: "", email: "", whatsapp: "", planId: "",
  utrNumber: "", colleges: [], referralSource: "",
  referralOther: "", remarks: "",
};

// Step labels shown in header
const STEPS = [
  "Personal Details",
  "Plan Selection",
  "Payment Details",
  "Other Details",
  "Remarks",
];

function useSaved<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const s = sessionStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  const set = (val: T | ((p: T) => T)) => {
    setV(prev => {
      const next = typeof val === "function" ? (val as (p: T) => T)(prev) : val;
      sessionStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };
  return [v, set] as const;
}

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 30 : -30, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -30 : 30, opacity: 0 }),
};

export function EnrollmentForm() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useSaved<FormData>("enroll_v3", INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans]     = useState<Plan[]>([]);
  const [payment, setPayment] = useState<PaymentSettings | null>(null);
  const [banner, setBanner]   = useState<BannerSettings | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchActivePlans().then(setPlans).catch(() => toast.error("Could not load plans."));
    fetchPaymentSettings().then(setPayment).catch(() => toast.error("Could not load payment details."));
    fetchBannerSettings().then(setBanner).catch(() => {});
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const update = (field: keyof FormData, value: string | string[]) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (step === 0) {
      if (!form.fullName.trim()) e.fullName = "Required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
      if (!/^\+?[\d\s\-]{8,15}$/.test(form.whatsapp)) e.whatsapp = "Enter a valid number";
    }
    if (step === 1 && !form.planId) e.planId = "Please select a plan" as unknown as string;
    if (step === 2 && !form.utrNumber.trim()) e.utrNumber = "Enter your UTR number";
    if (step === 3 && form.colleges.length === 0) e.colleges = "Select at least one IIT" as unknown as string;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const go = async (d: 1 | -1) => {
    if (d === 1 && !validate()) return;
    if (d === 1) {
      setSaving(true);
      try {
        await saveEnrollmentStep(step, form);
      } catch {
        toast.error("Could not save progress. Please try again.");
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setDir(d);
    setStep(s => s + d);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await saveEnrollmentStep(4, form);
      await submitEnrollment();
      clearEnrollmentSession();
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error && e.message === "DUPLICATE_SUBMISSION"
        ? "An enrollment with this email or UTR already exists."
        : "Submission failed. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return <ThankYou name={form.fullName} planId={form.planId} plans={plans} payment={payment} />;

  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh", background: "var(--background)" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{ background: "white", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 30 }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Brand row */}
          <div className="flex items-center gap-3 py-3">
            <img src="/logo_for_form .png" alt="LearnWithSanu"
              style={{ height: 36, width: "auto", objectFit: "contain" }} />
            {/* Step counter pill */}
            <div className="ml-auto shrink-0 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: PRIMARY, color: "white" }}>
              {step + 1}/{STEPS.length}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full overflow-hidden mb-2.5" style={{ background: "var(--muted)" }}>
            <motion.div
              className="h-1 rounded-full"
              style={{ background: PRIMARY }}
              initial={false}
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          {/* Step dots + label */}
          <div className="flex items-center justify-between pb-2.5">
            <span className="text-xs font-semibold" style={{ color: PRIMARY }}>{STEPS[step]}</span>
            <div className="flex items-center gap-1">
              {STEPS.map((_, i) => (
                <motion.div key={i}
                  animate={{ width: i === step ? 20 : 6, background: i <= step ? PRIMARY : "#e0e0f0" }}
                  transition={{ duration: 0.25 }}
                  style={{ height: 6, borderRadius: 999 }}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Scrollable body ─────────────────────────────────────── */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-32">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={slide}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.18, ease: "easeOut" }}>

              {step === 0 && <StepPersonal form={form} errors={errors} update={update} banner={banner} />}
              {step === 1 && <StepPlan form={form} errors={errors} update={update} plans={plans} />}
              {step === 2 && <StepPayment form={form} errors={errors} update={update} plans={plans} payment={payment} />}
              {step === 3 && <StepOther form={form} errors={errors} update={update} />}
              {step === 4 && <StepRemarks form={form} update={update} plans={plans} />}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Sticky bottom nav ───────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 border-t px-4 sm:px-6 py-3"
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)", borderColor: "var(--border)", zIndex: 30 }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => go(-1)}
              className="flex items-center gap-1.5 px-5 rounded-2xl text-sm font-medium transition-all active:scale-95"
              style={{ background: "var(--muted)", color: "var(--foreground)", minHeight: 50, border: "1.5px solid var(--border)" }}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <div className="flex-1" />
          {!isLast ? (
            <button onClick={() => go(1)} disabled={saving}
              className="flex items-center gap-2 px-7 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
              style={{ background: PRIMARY, color: "white", minHeight: 50, minWidth: 140, boxShadow: `0 4px 18px ${PRIMARY}44` }}>
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                : <>Continue <ArrowRight size={15} /></>}
            </button>
          ) : (
            <button onClick={submit} disabled={submitting || saving}
              className="flex items-center gap-2 px-7 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
              style={{ background: PRIMARY, color: "white", minHeight: 50, minWidth: 180, boxShadow: `0 4px 18px ${PRIMARY}44` }}>
              {submitting
                ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
                : <><Check size={15} /> Submit Enrollment</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Personal Details ───────────────────────────────── */
function StepPersonal({ form, errors, update, banner }: SP & { banner: BannerSettings | null }) {
  const badgeText = banner?.badge_text ?? "IIT Preparation Program";
  const headline  = banner?.headline  ?? "Get Into Your Dream IIT";
  const subtitle  = banner?.subtitle  ?? "Expert-led coaching · Personalized mentoring · Proven results";
  const pills     = banner?.pills     ?? ["500+ Students", "Top IITs", "Expert Mentors"];
  const imageUrl  = banner?.image_url ?? null;

  return (
    <div>
      {/* Banner */}
      <div className="rounded-2xl overflow-hidden mb-6"
        style={{ minHeight: "18vh", background: `linear-gradient(135deg, #0a1adc 0%, ${PRIMARY} 55%, #4f46e5 100%)`, position: "relative" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -30, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "absolute", bottom: -20, right: 40, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", top: 10, left: -10, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

        {/* Right-side image */}
        {imageUrl && (
          <img src={imageUrl} alt=""
            style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", width:120, height:120, borderRadius:20, objectFit:"cover" }}
          />
        )}

        <div className="relative flex flex-col justify-center h-full px-6 py-5"
          style={{ paddingRight: imageUrl ? 152 : undefined }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎓</span>
            <span className="text-white/80 text-sm font-medium">{badgeText}</span>
          </div>
          <h2 className="text-white font-bold text-lg leading-snug">{headline}</h2>
          <p className="text-white/70 text-sm mt-1">{subtitle}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {pills.filter(p => p.trim()).map(t => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "rgba(255,255,255,0.18)", color: "white" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Shell title="Let's get started 👋" sub="Fill in your basic details to begin.">
        <div className="space-y-4">
          <FInput label="Full Name" error={errors.fullName} icon={<User size={16} />}>
            <input type="text" value={form.fullName}
              onChange={e => update("fullName", e.target.value)}
              placeholder="e.g. Arjun Sharma" className="fi" />
          </FInput>
          <FInput label="Email Address" error={errors.email} icon={<Mail size={16} />}>
            <input type="email" value={form.email}
              onChange={e => update("email", e.target.value)}
              placeholder="you@example.com" className="fi" />
          </FInput>
          <FInput label="WhatsApp Number" error={errors.whatsapp} icon={<Phone size={16} />}>
            <input type="tel" value={form.whatsapp}
              onChange={e => update("whatsapp", e.target.value)}
              placeholder="+91 98765 43210" className="fi" />
          </FInput>
          <p className="flex items-center gap-1.5 text-xs pt-1" style={{ color: "var(--muted-foreground)" }}>
            <ShieldCheck size={12} style={{ color: PRIMARY }} /> Your info is secure and never shared.
          </p>
        </div>
      </Shell>
    </div>
  );
}

/* ── Step 2: Plan Selection ─────────────────────────────────── */
function StepPlan({ form, errors, update, plans }: SP & { plans: Plan[] }) {
  return (
    <Shell title="Choose your plan 📋" sub="Select the program that fits your goals.">
      {errors.planId && <Err msg={String(errors.planId)} />}
      {plans.length === 0 && (
        <p className="text-sm mb-3" style={{ color: "var(--muted-foreground)" }}>Loading plans…</p>
      )}
      <div className="space-y-2.5">
        {plans.map(plan => {
          const sel = form.planId === plan.id;
          return (
            <button key={plan.id} onClick={() => update("planId", plan.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.99]"
              style={{
                background: sel ? "var(--secondary)" : "white",
                border: `1.5px solid ${sel ? PRIMARY : "var(--border)"}`,
                boxShadow: sel ? `0 4px 16px ${PRIMARY}20` : "0 1px 3px rgba(0,0,0,0.05)",
              }}>
              {/* Radio dot */}
              <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                style={{ background: sel ? PRIMARY : "white", border: `2px solid ${sel ? PRIMARY : "var(--border)"}` }}>
                {sel && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{plan.name}</span>
                  {plan.tag && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${PRIMARY}15`, color: PRIMARY }}>
                      {plan.tag}
                    </span>
                  )}
                </div>
                {(plan.duration_weeks || plan.session_limit) && (
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    {plan.duration_weeks && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: "#E8FFF6", color: "#008963" }}>
                        Duration : {plan.duration_weeks} weeks
                      </span>
                    )}
                    {plan.session_limit && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: "#FFF6EB", color: "#FF9900" }}>
                        No. of Session : {plan.session_limit}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <span className="shrink-0 text-sm font-bold" style={{ color: sel ? PRIMARY : "var(--foreground)" }}>
                ₹{plan.price.toLocaleString("en-IN")}/-
              </span>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

/* ── Step 3: Payment Details ────────────────────────────────── */
function StepPayment({ form, errors, update, plans, payment }: SP & { plans: Plan[]; payment: PaymentSettings | null }) {
  const [copied, setCopied] = useState(false);
  const plan = plans.find(p => p.id === form.planId);
  const upiId = payment?.upi_id ?? "";
  const upiName = payment?.upi_name ?? "";

  const copyUPI = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      toast.success("UPI ID copied!", { description: "Open your UPI app and paste to pay." });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Could not copy — please copy manually.");
    }
  };

  const pasteUTR = async () => {
    try {
      const t = await navigator.clipboard.readText();
      update("utrNumber", t.trim().toUpperCase());
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  return (
    <Shell title="Payment details 💳" sub="Pay via UPI, then enter your transaction number.">

      {/* Amount chip */}
      {plan && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
          style={{ background: `${PRIMARY}10`, border: `1.5px solid ${PRIMARY}20` }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: PRIMARY }}>
            <Check size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Selected plan</p>
            <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{plan.name}</p>
          </div>
          <span className="text-lg font-bold shrink-0" style={{ color: PRIMARY }}>
            ₹{plan.price.toLocaleString("en-IN")}
          </span>
        </div>
      )}

      {/* UPI Card */}
      <div className="rounded-2xl overflow-hidden mb-4"
        style={{ background: `linear-gradient(140deg, #0a1adc 0%, ${PRIMARY} 60%, #1a0e9a 100%)`, boxShadow: `0 8px 28px ${PRIMARY}40` }}>

        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-1.5 mb-4">
            <ShieldCheck size={13} className="text-green-300" />
            <span className="text-green-300 text-xs font-semibold uppercase tracking-wider">Verified UPI Account</span>
          </div>

          <div className="flex items-start gap-4">
            {/* QR */}
            <div className="shrink-0 bg-white rounded-xl p-2.5">
              {payment?.qr_code_url ? (
                <img src={payment.qr_code_url} alt="UPI QR Code" width={100} height={100}
                  className="rounded-lg object-contain" style={{ width: 100, height: 100 }} />
              ) : (
                <QR size={100} />
              )}
            </div>
            {/* UPI info */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-white/60 text-xs">Pay to</p>
              <p className="text-white font-semibold">{upiName}</p>
              <p className="text-white/50 text-xs mb-3">Verified ✓</p>
              <p className="text-white/60 text-xs mb-1">UPI ID</p>
              <div onClick={copyUPI}
                className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer active:scale-95 transition-all"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}>
                <span className="text-white font-mono text-xs flex-1 truncate">{upiId}</span>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all"
                  style={{ background: copied ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.15)" }}>
                  {copied ? <Check size={11} className="text-green-300" /> : <Copy size={11} className="text-white/70" />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copy button */}
        <button onClick={copyUPI}
          className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all active:scale-95"
          style={{ background: copied ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.1)", color: copied ? "#4ade80" : "white", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Tap to Copy UPI ID</>}
        </button>
      </div>

      {/* 3-step guide */}
      <div className="rounded-2xl p-4 mb-5"
        style={{ background: "white", border: "1.5px solid var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--muted-foreground)" }}>How to pay</p>
        <div className="flex items-start">
          {[
            { n: "1", t: "Copy UPI ID", s: "Tap above" },
            { n: "2", t: "Open UPI App", s: "GPay, PhonePe…" },
            { n: "3", t: "Paste & Pay", s: "Complete payment" },
          ].map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center text-center relative">
              {i < 2 && <div className="absolute top-3.5 left-[55%] right-0 h-px" style={{ background: "var(--border)" }} />}
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-2 z-10"
                style={{ background: "var(--secondary)", color: PRIMARY }}>
                {s.n}
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{s.t}</p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{s.s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* UTR field */}
      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--foreground)" }}>
          UTR / Transaction Number <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <p className="text-xs mb-2.5" style={{ color: "var(--muted-foreground)" }}>
          Find it in your UPI app → Transaction history → Copy the 12-digit Ref number
        </p>
        <textarea
          value={form.utrNumber}
          onChange={e => update("utrNumber", e.target.value.toUpperCase())}
          placeholder="e.g. UTR123456789012"
          rows={2}
          className="w-full px-4 py-3.5 rounded-2xl text-sm resize-none outline-none transition-all mb-2"
          style={{
            background: "white",
            border: `1.5px solid ${errors.utrNumber ? "var(--destructive)" : "var(--border)"}`,
            color: "var(--foreground)",
            fontFamily: "monospace",
            letterSpacing: "0.05em",
            fontSize: 15,
          }}
        />
        {errors.utrNumber && <Err msg={errors.utrNumber} />}
        <button onClick={pasteUTR}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: "var(--secondary)", color: PRIMARY, border: `1.5px solid ${PRIMARY}20` }}>
          <Clipboard size={15} /> Paste from Clipboard
        </button>
      </div>
    </Shell>
  );
}

/* ── Step 4: Other Details ──────────────────────────────────── */
function StepOther({ form, errors, update }: SP) {
  const toggle = (id: string) => {
    const cur = form.colleges;
    if (cur.includes(id)) {
      update("colleges", cur.filter(c => c !== id));
    } else if (cur.length < 3) {
      update("colleges", [...cur, id]);
    } else {
      toast.info("You can select up to 3 IITs");
    }
  };

  return (
    <Shell title="A few more details 📌" sub="Help us personalise your experience.">
      {/* IIT Targets */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Which IITs are you targeting?
          </p>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "var(--secondary)", color: PRIMARY }}>
            {form.colleges.length}/3
          </span>
        </div>
        {errors.colleges && <Err msg={String(errors.colleges)} />}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {IIT_OPTIONS.map(iit => {
            const sel = form.colleges.includes(iit.id);
            const locked = !sel && form.colleges.length >= 3;
            return (
              <button key={iit.id} onClick={() => toggle(iit.id)} disabled={locked}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-medium text-left transition-all active:scale-95 disabled:opacity-30"
                style={{
                  background: sel ? PRIMARY : "white",
                  color: sel ? "white" : "var(--foreground)",
                  border: `1.5px solid ${sel ? PRIMARY : "var(--border)"}`,
                  boxShadow: sel ? `0 3px 12px ${PRIMARY}28` : "0 1px 3px rgba(0,0,0,0.05)",
                }}>
                <div className="shrink-0 w-4 h-4 rounded flex items-center justify-center"
                  style={{ background: sel ? "rgba(255,255,255,0.25)" : "var(--muted)" }}>
                  {sel && <Check size={10} style={{ color: "white" }} />}
                </div>
                <span className="text-xs leading-tight">{iit.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Referral */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
          How did you find us?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {REFERRAL_OPTIONS.map(opt => {
            const sel = form.referralSource === opt.id;
            return (
              <button key={opt.id} onClick={() => update("referralSource", opt.id)}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-medium text-left transition-all active:scale-95"
                style={{
                  background: sel ? PRIMARY : "white",
                  color: sel ? "white" : "var(--foreground)",
                  border: `1.5px solid ${sel ? PRIMARY : "var(--border)"}`,
                  boxShadow: sel ? `0 3px 12px ${PRIMARY}28` : "0 1px 3px rgba(0,0,0,0.05)",
                }}>
                <span className="text-base shrink-0">{opt.emoji}</span>
                <span className="text-xs leading-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {form.referralSource === "others" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
              <FInput label="Please specify" icon={<MessageCircle size={16} />}>
                <input type="text" value={form.referralOther}
                  onChange={e => update("referralOther", e.target.value)}
                  placeholder="Where did you find us?" className="fi" autoFocus />
              </FInput>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}

/* ── Step 5: Remarks (last step) ────────────────────────────── */
function StepRemarks({ form, update, plans }: { form: FormData; update: (f: keyof FormData, v: string) => void; plans: Plan[] }) {
  const plan = plans.find(p => p.id === form.planId);
  const colleges = IIT_OPTIONS.filter(o => form.colleges.includes(o.id));

  return (
    <Shell title="Any remarks? 📝" sub="Optional — share anything else you'd like us to know.">
      {/* Mini summary */}
      <div className="rounded-2xl overflow-hidden mb-5" style={{ border: "1.5px solid var(--border)" }}>
        {[
          { l: "Name", v: form.fullName },
          { l: "Email", v: form.email },
          { l: "WhatsApp", v: form.whatsapp },
          { l: "Plan", v: plan ? `${plan.name} — ₹${plan.price.toLocaleString("en-IN")}` : "—" },
          { l: "IIT Targets", v: colleges.length ? colleges.map(c => c.label).join(", ") : "—" },
          { l: "UTR", v: form.utrNumber || "—" },
        ].map((r, i) => (
          <div key={r.l} className="flex items-start gap-3 px-4 py-2.5"
            style={{ background: i % 2 === 0 ? "white" : "var(--muted)", borderBottom: i < 5 ? "1px solid var(--border)" : "none" }}>
            <span className="text-xs font-semibold shrink-0 mt-0.5" style={{ width: 84, color: "var(--muted-foreground)" }}>{r.l}</span>
            <span className="text-xs font-medium flex-1 break-all" style={{ color: "var(--foreground)" }}>{r.v}</span>
          </div>
        ))}
      </div>

      {/* Remarks textarea */}
      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--foreground)" }}>
          Any Remarks <span className="font-normal" style={{ color: "var(--muted-foreground)" }}>(optional)</span>
        </label>
        <textarea
          value={form.remarks}
          onChange={e => update("remarks", e.target.value)}
          placeholder="Optional — Add any additional notes or questions"
          rows={4}
          className="w-full px-4 py-3.5 rounded-2xl text-sm resize-none outline-none transition-all"
          style={{
            background: "white",
            border: "1.5px solid var(--border)",
            color: "var(--foreground)",
            lineHeight: 1.6,
          }}
        />
      </div>
    </Shell>
  );
}

/* ── Thank You Screen ───────────────────────────────────────── */
function ThankYou({ name, planId, plans, payment }: {
  name: string; planId: string; plans: Plan[]; payment: PaymentSettings | null;
}) {
  const plan = plans.find(p => p.id === planId);
  const supportNo = payment?.support_phone ?? "9390715011";
  const supportDisplay = payment?.support_display ?? "939 071 5011";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "var(--background)" }}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        className="max-w-sm w-full rounded-3xl overflow-hidden"
        style={{ background: "white", boxShadow: `0 24px 64px ${PRIMARY}22`, border: "1.5px solid var(--border)" }}>

        {/* Illustration header */}
        <div className="relative px-6 pt-8 pb-6 flex flex-col items-center text-center overflow-hidden"
          style={{ background: `linear-gradient(145deg, #0a1adc 0%, ${PRIMARY} 55%, #4f46e5 100%)` }}>
          {/* Background decoration */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

          {/* Checkmark illustration */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.22, type: "spring", stiffness: 200, damping: 14 }}
            className="relative z-10 mb-4"
          >
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.18)" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <motion.path
                    d="M8 16.5 L13.5 22 L24 11"
                    stroke={PRIMARY}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.45, duration: 0.5, ease: "easeOut" }}
                  />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }} className="relative z-10">
            <h2 className="text-white font-bold text-xl">Thank You!</h2>
            <p className="text-white/80 text-sm mt-1">
              {name ? `Hey ${name.split(" ")[0]}, ` : ""}we've received your enrollment.
            </p>
          </motion.div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-center" style={{ color: "var(--muted-foreground)" }}>
            We have noted your payment. Our team will reach out to you soon.
          </p>

          {plan && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: "var(--secondary)", border: `1.5px solid ${PRIMARY}15` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: PRIMARY }}>
                <Check size={14} className="text-white" />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Enrolled in</p>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{plan.name}</p>
              </div>
              <span className="ml-auto text-sm font-bold" style={{ color: PRIMARY }}>
                ₹{plan.price.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          <div className="space-y-3">
            {[
              { icon: "🔍", t: "Payment Under Verification", s: "We'll verify your UTR in 2–4 hours." },
              { icon: "💬", t: "You'll hear from us on WhatsApp", s: "Confirmation within 24 hours." },
            ].map(item => (
              <div key={item.t} className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{item.t}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{item.s}</p>
                </div>
              </div>
            ))}
          </div>

          {/* WhatsApp support */}
          <a href={`https://wa.me/91${supportNo}`}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: "#22C55E", color: "white", boxShadow: "0 4px 14px rgba(34,197,94,0.3)" }}>
            <MessageCircle size={15} />
            Chat on WhatsApp · {supportDisplay}
          </a>

          <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
            Join Telegram Group:{" "}
            <a href="https://t.me/LearnWithSanu" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: PRIMARY }}>
              @LearnWithSanu
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Decorative QR ──────────────────────────────────────────── */
function QR({ size }: { size: number }) {
  const cell = Math.floor(size / 21);
  const grid = buildQR();
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {grid.map((row, r) => row.map((on, c) =>
        on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill={PRIMARY} /> : null
      ))}
    </svg>
  );
}

function buildQR(): boolean[][] {
  const n = 21;
  const g: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  const finder = (r: number, c: number) => {
    for (let dr = 0; dr < 7; dr++) for (let dc = 0; dc < 7; dc++) {
      if (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4))
        g[r + dr][c + dc] = true;
    }
  };
  finder(0, 0); finder(0, 14); finder(14, 0);
  for (let i = 8; i < 13; i++) { if (i % 2 === 0) { g[6][i] = true; g[i][6] = true; } }
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (!g[r][c] && (r * 29 + c * 13 + 7) % 5 < 2) g[r][c] = true;
  return g;
}

/* ── Shared primitives ──────────────────────────────────────── */
interface SP {
  form: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  update: (f: keyof FormData, v: string | string[]) => void;
}

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-bold mb-1" style={{ color: "var(--foreground)" }}>{title}</h1>
      <p className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>{sub}</p>
      {children}
    </div>
  );
}

function FInput({ label, error, icon, children }: {
  label: string; error?: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--foreground)" }}>{label}</label>
      <div className="flex items-center gap-2.5 px-4 rounded-2xl transition-all focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#132BFC]/30"
        style={{ background: "white", border: `1.5px solid ${error ? "var(--destructive)" : "var(--border)"}`, minHeight: 52 }}>
        <span style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>{icon}</span>
        <div className="flex-1">{children}</div>
      </div>
      {error && <Err msg={error} />}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <p className="flex items-center gap-1 text-xs mt-1.5" style={{ color: "var(--destructive)" }}>
      <AlertCircle size={11} /> {msg}
    </p>
  );
}
