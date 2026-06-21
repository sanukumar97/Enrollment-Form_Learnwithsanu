import { supabase } from "../lib/supabase";

export interface BannerSettings {
  id: string;
  badge_text: string;
  headline: string;
  subtitle: string;
  pills: string[];
  image_url: string | null;
}

const FALLBACK: BannerSettings = {
  id: "fallback",
  badge_text: "IIT Preparation Program",
  headline: "Get Into Your Dream IIT",
  subtitle: "Expert-led coaching · Personalized mentoring · Proven results",
  pills: ["500+ Students", "Top IITs", "Expert Mentors"],
  image_url: null,
};

export async function fetchBannerSettings(): Promise<BannerSettings> {
  const { data, error } = await supabase
    .from("banner_settings")
    .select("id, badge_text, headline, subtitle, pills, image_url")
    .limit(1)
    .maybeSingle();
  if (error || !data) return FALLBACK;
  return data as BannerSettings;
}
