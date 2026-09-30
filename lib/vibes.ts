import type { ReviewVibe } from "@/lib/supabase/database.types";

export type VibeInfo = { value: ReviewVibe; label: string; emoji: string };

/** Mood tags, in display order. Values mirror the `review_vibe` Postgres enum. */
export const VIBES: readonly VibeInfo[] = [
  { value: "paisible", label: "Paisible", emoji: "🕊️" },
  { value: "voisins_bruyants", label: "Voisins bruyants", emoji: "📢" },
  { value: "gothique_chic", label: "Gothique chic", emoji: "🦇" },
  { value: "touristique", label: "Touristique", emoji: "📸" },
  { value: "hante", label: "Hanté", emoji: "👻" },
  { value: "abandonne", label: "Abandonné", emoji: "🕸️" },
];

export const VIBE_VALUES = VIBES.map((v) => v.value) as [ReviewVibe, ...ReviewVibe[]];

const BY_VALUE = new Map(VIBES.map((v) => [v.value, v]));

export function vibeInfo(value: ReviewVibe): VibeInfo {
  return BY_VALUE.get(value) ?? { value, label: value, emoji: "🪦" };
}
