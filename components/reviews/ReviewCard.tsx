import type { ReactNode } from "react";

import ScoreDisplay from "@/components/ui/ScoreDisplay";
import VibeTag from "@/components/ui/VibeTag";
import { formatDate, isEdited } from "@/lib/format";
import type { Review } from "@/lib/repositories/review-repository";

type Props = {
  review: Review;
  /** Replaces the author line (e.g. the cemetery name on "Mes contributions"). */
  heading?: ReactNode;
  highlighted?: boolean;
  actions?: ReactNode;
};

export default function ReviewCard({ review, heading, highlighted = false, actions }: Props) {
  return (
    <article
      className={`rounded-xl border p-4 ${highlighted ? "border-candle bg-vault" : "border-mist bg-tomb"}`}
      aria-label={`Avis de ${review.username}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {heading ?? <p className="font-semibold text-bone">{review.username}</p>}
        <p className="text-ash">
          <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
          {isEdited(review.createdAt, review.updatedAt) && <span> (modifié)</span>}
        </p>
      </header>

      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1">
        <ScoreDisplay kind="rating" value={review.rating} />
        <ScoreDisplay kind="humidity" value={review.humidity} />
      </div>

      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Ambiance">
        {review.vibes.map((vibe) => (
          <li key={vibe}>
            <VibeTag vibe={vibe} />
          </li>
        ))}
      </ul>

      <p className="mt-3 whitespace-pre-line break-words text-bone">{review.comment}</p>

      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}
