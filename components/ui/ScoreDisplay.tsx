const MAX = 5;

type ScoreKind = "rating" | "humidity";

const KINDS: Record<ScoreKind, { icon: string; label: string }> = {
  rating: { icon: "💀", label: "Note" },
  humidity: { icon: "💧", label: "Humidité" },
};

export function formatScore(value: number): string {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/**
 * Read-only score as 5 icons (skulls or drops). Screen readers get one
 * sentence ("Note : 4,2 sur 5") instead of five emoji.
 */
export default function ScoreDisplay({ kind, value, size = "md" }: { kind: ScoreKind; value: number; size?: "md" | "lg" }) {
  const { icon, label } = KINDS[kind];
  const rounded = Math.round(value);
  const textSize = size === "lg" ? "text-2xl" : "text-lg";

  return (
    <span role="img" aria-label={`${label} : ${formatScore(value)} sur ${MAX}`} className={`inline-flex gap-0.5 ${textSize}`}>
      {Array.from({ length: MAX }, (_, i) => (
        <span key={i} aria-hidden="true" className={i < rounded ? "" : "opacity-25 grayscale"}>
          {icon}
        </span>
      ))}
    </span>
  );
}
