import type { Metadata } from "next";
import Link from "next/link";

import DeleteReviewButton from "@/components/reviews/DeleteReviewButton";
import ReviewCard from "@/components/reviews/ReviewCard";
import { requireUser } from "@/lib/auth/session";
import { createReviewService } from "@/lib/services/factory";
import { cemeteryPath, UNNAMED_CEMETERY } from "@/lib/types";

export const metadata: Metadata = {
  title: "Mes contributions",
  description: "Retrouvez, modifiez ou supprimez vos avis sur les cimetières.",
  robots: { index: false },
};

export default async function MyContributionsPage() {
  const user = await requireUser("/mes-contributions");
  const reviews = await (await createReviewService()).listByUser(user.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Mes contributions</h1>
      <p className="mt-1 text-ash">
        {reviews.length === 0
          ? "Vous n'avez encore laissé aucun avis."
          : `${reviews.length} avis laissé${reviews.length > 1 ? "s" : ""} par ${user.username}.`}
      </p>

      {reviews.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-mist p-8 text-center">
          <p className="text-ash">Parcourez la carte, ouvrez la fiche d&apos;un cimetière et partagez votre ressenti.</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md bg-candle px-4 py-2 font-semibold text-crypt no-underline hover:bg-candle-dark"
          >
            Explorer la carte
          </Link>
        </div>
      ) : (
        <ol className="mt-6 flex flex-col gap-4">
          {reviews.map((review) => {
            const name = review.cemetery.name ?? UNNAMED_CEMETERY;
            return (
              <li key={review.id}>
                <ReviewCard
                  review={review}
                  heading={
                    <h2 className="font-display text-lg font-bold">
                      <Link href={cemeteryPath(review.cemetery)}>{name}</Link>
                    </h2>
                  }
                  actions={
                    <>
                      <Link
                        href={`/avis/${review.id}/modifier`}
                        className="rounded-md bg-candle px-3 py-1.5 font-semibold text-crypt no-underline hover:bg-candle-dark"
                      >
                        Modifier
                      </Link>
                      <DeleteReviewButton reviewId={review.id} cemeteryName={name} />
                    </>
                  }
                />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
