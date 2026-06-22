import { supabase } from "../lib/supabase";
import type { Plan } from "../app/components/enrollment/types";
import { PLANS as FALLBACK_PLANS } from "../app/components/enrollment/types";

export async function fetchActivePlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("slug, name, price_paise, tag, display_order, duration_weeks, session_limit")
    .eq("is_active", true)
    .eq("form_type", "paid")
    .order("display_order", { ascending: true });

  if (error || !data?.length) {
    console.warn("Could not load plans from Supabase, using fallback:", error?.message);
    return FALLBACK_PLANS;
  }

  return data.map(row => ({
    id: row.slug,
    name: row.name,
    price: row.price_paise / 100,
    tag: row.tag ?? undefined,
    duration_weeks: (row as Record<string, unknown>).duration_weeks as string | undefined ?? undefined,
    session_limit: (row as Record<string, unknown>).session_limit as string | undefined ?? undefined,
  }));
}
