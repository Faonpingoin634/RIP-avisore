import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import DeleteReviewButton from "@/components/reviews/DeleteReviewButton";
import ReviewCard from "@/components/reviews/ReviewCard";
import ReviewForm from "@/components/reviews/ReviewForm";
import ReviewList from "@/components/reviews/ReviewList";
import RetryButton from "@/components/ui/RetryButton";
import ScoreDisplay, { formatScore } from "@/components/ui/ScoreDisplay";
import { loginUrlFor } from "@/lib/auth/safe-redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { lookupCemetery, parseCemeteryParams, type CemeteryParams } from "@/lib/cemetery-page";
import { safeExternalUrl, wikipediaUrl } from "@/lib/format";
import { mapUrlFor } from "@/lib/map/view";
import type { StoredCemetery } from "@/lib/repositories/cemetery-repository";
import { createReviewService } from "@/lib/services/factory";
import { cemeteryPath, UNNAMED_CEMETERY } from "@/lib/types";

type Props = { params: Promise<CemeteryParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parseCemeteryParams(await params);
  if (!parsed) return { title: "Cette tombe est vide" };
  const lookup = await lookupCemetery(parsed.osmType, parsed.osmId);
  if (lookup.status !== "found") return { title: "Cimetière" };

  const name = lookup.cemetery.name ?? UNNAMED_CEMETERY;
  const rating =
    lookup.cemetery.avgRating !== null
      ? ` Note moyenne : ${formatScore(lookup.cemetery.avgRating)}/5 sur ${lookup.cemetery.reviewCount} avis.`
      : "";
  return { title: name, description: `Avis, ambiance et humidité du ${name}.${rating}` };
}

function InfoLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="underline">
      {children}
      <span className="sr-only"> (nouvel onglet)</span>
    </a>
  );
}

function CemeteryHeader({ cemetery }: { cemetery: StoredCemetery }) {
  const wiki = wikipediaUrl(cemetery.tags.wikipedia);
  const website = safeExternalUrl(cemetery.tags.website);
  const osmUrl = `https://www.openstreetmap.org/${cemetery.osmType}/${cemetery.osmId}`;

  return (
    <header className="rounded-xl border border-mist bg-tomb p-6">
      <h1 className="font-display text-3xl font-bold">{cemetery.name ?? UNNAMED_CEMETERY}</h1>

      <dl className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
        {cemetery.tags.religion && (
          <>
            <dt className="text-ash">Religion</dt>
            <dd>{cemetery.tags.religion}</dd>
          </>
        )}
        {cemetery.tags.operator && (
          <>
            <dt className="text-ash">Gestionnaire</dt>
            <dd>{cemetery.tags.operator}</dd>
          </>
        )}
        <dt className="text-ash">Coordonnées</dt>
        <dd>
          {cemetery.lat.toFixed(5)}, {cemetery.lon.toFixed(5)}
        </dd>
      </dl>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <li>
          <Link href={mapUrlFor(cemetery.lat, cemetery.lon)} className="underline">
            🗺️ Voir sur la carte
          </Link>
        </li>
        <li>
          <InfoLink href={osmUrl}>Voir sur OpenStreetMap</InfoLink>
        </li>
        {wiki && (
          <li>
            <InfoLink href={wiki}>Wikipédia</InfoLink>
          </li>
        )}
        {website && (
          <li>
            <InfoLink href={website}>Site web</InfoLink>
          </li>
        )}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-mist pt-4">
        {cemetery.reviewCount > 0 && cemetery.avgRating !== null && cemetery.avgHumidity !== null ? (
          <>
            <div>
              <p className="text-ash">Note moyenne</p>
              <p className="flex items-center gap-2">
                <ScoreDisplay kind="rating" value={cemetery.avgRating} size="lg" />
                <span className="font-bold">{formatScore(cemetery.avgRating)}/5</span>
              </p>
            </div>
            <div>
              <p className="text-ash">Humidité moyenne</p>
              <p className="flex items-center gap-2">
                <ScoreDisplay kind="humidity" value={cemetery.avgHumidity} size="lg" />
                <span className="font-bold">{formatScore(cemetery.avgHumidity)}/5</span>
              </p>
            </div>
            <p className="font-semibold">{cemetery.reviewCount} avis</p>
          </>
        ) : (
          <p className="text-ash">Pas encore noté.</p>
        )}
      </div>
    </header>
  );
}

export default async function CemeteryPage({ params }: Props) {
  const parsed = parseCemeteryParams(await params);
  if (!parsed) notFound();

  const lookup = await lookupCemetery(parsed.osmType, parsed.osmId);
  if (lookup.status === "not-found") notFound();
  if (lookup.status === "unavailable") {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <p className="text-5xl" aria-hidden="true">🌫️</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Le brouillard est trop épais</h1>
        <p className="mt-2 text-ash">
          Les serveurs OpenStreetMap ne répondent pas pour le moment, et ce cimetière n&apos;a encore jamais été
          consulté sur RIP-Advisor. Réessayez dans quelques instants.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <RetryButton />
          <Link href="/" className="rounded-md border border-mist px-4 py-2 text-bone no-underline hover:bg-vault">
            Retour à la carte
          </Link>
        </div>
      </div>
    );
  }

  const { cemetery } = lookup;
  const path = cemeteryPath(cemetery);
  const name = cemetery.name ?? UNNAMED_CEMETERY;
  const [user, reviews] = await Promise.all([
    getCurrentUser(),
    createReviewService().then((service) => service.listForCemetery(cemetery.id)),
  ]);
  const ownReview = user ? reviews.find((r) => r.userId === user.id) : undefined;
  const otherReviews = ownReview ? reviews.filter((r) => r.id !== ownReview.id) : reviews;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <CemeteryHeader cemetery={cemetery} />

      <section aria-labelledby="donner-avis" className="rounded-xl border border-mist bg-tomb p-6">
        {!user && (
          <>
            <h2 id="donner-avis" className="font-display text-xl font-bold">
              Vous y êtes passé ?
            </h2>
            <p className="mt-2 text-ash">Connectez-vous pour donner votre avis sur ce cimetière.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={loginUrlFor(path)}
                className="rounded-md bg-candle px-4 py-2 font-semibold text-crypt no-underline hover:bg-candle-dark"
              >
                Se connecter
              </Link>
              <Link
                href={`/inscription?next=${encodeURIComponent(path)}`}
                className="rounded-md border border-mist px-4 py-2 text-bone no-underline hover:bg-vault"
              >
                Créer un compte
              </Link>
            </div>
          </>
        )}

        {user && !ownReview && (
          <>
            <h2 id="donner-avis" className="mb-4 font-display text-xl font-bold">
              Donner mon avis
            </h2>
            <ReviewForm mode="create" cemeteryId={cemetery.id} />
          </>
        )}

        {user && ownReview && (
          <div id="mon-avis">
            <h2 id="donner-avis" className="mb-4 font-display text-xl font-bold">
              Mon avis
            </h2>
            <ReviewCard
              review={ownReview}
              highlighted
              actions={
                <>
                  <Link
                    href={`/avis/${ownReview.id}/modifier`}
                    className="rounded-md bg-candle px-3 py-1.5 font-semibold text-crypt no-underline hover:bg-candle-dark"
                  >
                    Modifier
                  </Link>
                  <DeleteReviewButton reviewId={ownReview.id} cemeteryName={name} />
                </>
              }
            />
          </div>
        )}
      </section>

      <section aria-labelledby="avis">
        <h2 id="avis" className="mb-4 font-display text-2xl font-bold">
          {ownReview ? "Les autres avis" : "Les avis"}
        </h2>
        <ReviewList reviews={otherReviews} />
      </section>
    </div>
  );
}
