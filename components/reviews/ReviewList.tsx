import type { Review } from "@/lib/repositories/review-repository";
import ReviewCard from "./ReviewCard";

export const EMPTY_REVIEWS = "Aucun avis. Soyez le premier à troubler le silence.";

export default function ReviewList({ reviews }: { reviews: readonly Review[] }) {
  if (reviews.length === 0) {
    return <p className="rounded-xl border border-dashed border-mist p-6 text-center text-ash">{EMPTY_REVIEWS}</p>;
  }
  return (
    <ol className="flex flex-col gap-4">
      {reviews.map((review) => (
        <li key={review.id}>
          <ReviewCard review={review} />
        </li>
      ))}
    </ol>
  );
}
