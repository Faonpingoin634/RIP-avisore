import type { ReviewVibe } from "@/lib/types";
import { vibeInfo } from "@/lib/vibes";

export default function VibeTag({ vibe }: { vibe: ReviewVibe }) {
  const { label, emoji } = vibeInfo(vibe);
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-mist bg-vault px-2.5 py-0.5 text-bone">
      <span aria-hidden="true">{emoji}</span>
      {label}
    </span>
  );
}
