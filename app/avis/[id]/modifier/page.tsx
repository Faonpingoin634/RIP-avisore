import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import DeleteReviewButton from "@/components/reviews/DeleteReviewButton";
import ReviewForm from "@/components/reviews/ReviewForm";
import { requireUser } from "@/lib/auth/session";
import { createReviewService } from "@/lib/services/factory";
import { cemeteryPath, UNNAMED_CEMETERY } from "@/lib/types";

export const metadata: Metadata = {
  title: "Modifier mon avis",
  description: "Modifiez votre avis sur un cimetière.",
  robots: { index: false },
};

export default async function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/avis/${encodeURIComponent(id)}/modifier`);
  if (!z.uuid().safeParse(id).success) notFound();

  // Scoped to the current user: someone else's review is indistinguishable from a missing one.
  const review = await (await createReviewService()).findOwned(id, user.id);
  if (!review) notFound();

  const name = review.cemetery.name ?? UNNAMED_CEMETERY;
  const backHref = cemeteryPath(review.cemetery);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href={backHref} className="underline">
        ← Retour à la fiche
      </Link>
      <div className="mt-4 rounded-xl border border-mist bg-tomb p-6">
        <h1 className="font-display text-2xl font-bold">Modifier mon avis</h1>
        <p className="mt-1 text-ash">{name}</p>
        <div className="mt-6">
          <ReviewForm
            mode="edit"
            reviewId={review.id}
            initial={{ rating: review.rating, humidity: review.humidity, vibes: review.vibes, comment: review.comment }}
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-mist pt-4">
          <Link href={backHref} className="text-ash underline">
            Annuler
          </Link>
          <DeleteReviewButton reviewId={review.id} cemeteryName={name} />
        </div>
      </div>
    </div>
  );
}
