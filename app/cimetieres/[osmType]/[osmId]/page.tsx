import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import OwnReviewActions from "@/components/reviews/OwnReviewActions";
import ReviewCard from "@/components/reviews/ReviewCard";
import ReviewForm from "@/components/reviews/ReviewForm";
import ReviewList from "@/components/reviews/ReviewList";
import Ornament from "@/components/ui/Ornament";
import RetryButton from "@/components/ui/RetryButton";
import ScoreDisplay, { formatScore } from "@/components/ui/ScoreDisplay";
import { buttonStyles } from "@/components/ui/styles";
import { loginUrlFor } from "@/lib/auth/safe-redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { lookupCemetery, parseCemeteryParams, type CemeteryParams } from "@/lib/cemetery-page";
import { safeExternalUrl, wikipediaUrl } from "@/lib/format";
import { mapUrlFor } from "@/lib/map/view";
import type { StoredCemetery } from "@/lib/repositories/cemetery-repository";
import { createReviewService } from "@/lib/services/factory";
import { cemeteryName, cemeteryPath } from "@/lib/types";

type Props = { params: Promise<CemeteryParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parseCemeteryParams(await params);
  if (!parsed) return { title: "Cette tombe est vide" };
  const lookup = await lookupCemetery(parsed.osmType, parsed.osmId);
  if (lookup.status !== "found") return { title: "Cimetière" };

  const name = cemeteryName(lookup.cemetery);
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

function ScoreStat({ kind, label, value }: { kind: "rating" | "humidity"; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-mist bg-crypt/50 p-4">
      <p className="text-ash">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">
        {formatScore(value)}
        <span className="font-sans text-base font-normal text-ash"> / 5</span>
      </p>
      <ScoreDisplay kind={kind} value={value} />
    </div>
  );
}

function CemeteryHeader({ cemetery }: { cemetery: StoredCemetery }) {
  const wiki = wikipediaUrl(cemetery.tags.wikipedia);
  const website = safeExternalUrl(cemetery.tags.website);
  const osmUrl = `https://www.openstreetmap.org/${cemetery.osmType}/${cemetery.osmId}`;

  return (
    <header className="rounded-xl border border-mist bg-tomb p-6 sm:p-8">
      <h1 className="font-display text-3xl font-bold tracking-wide sm:text-4xl">{cemeteryName(cemetery)}</h1>
      <Ornament className="mt-4" />

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
            Voir sur la carte
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

      {cemetery.reviewCount > 0 && cemetery.avgRating !== null && cemetery.avgHumidity !== null ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <ScoreStat kind="rating" label="Note moyenne" value={cemetery.avgRating} />
          <ScoreStat kind="humidity" label="Humidité moyenne" value={cemetery.avgHumidity} />
          <div className="rounded-lg border border-mist bg-crypt/50 p-4">
            <p className="text-ash">Contributions</p>
            <p className="mt-1 font-display text-3xl font-bold">
              {cemetery.reviewCount}
              <span className="font-sans text-base font-normal text-ash"> avis</span>
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-mist p-4 text-center text-ash">Pas encore noté.</p>
      )}
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
        <p className="text-5xl grayscale" aria-hidden="true">🌫️</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Le brouillard est trop épais</h1>
        <p className="mt-2 text-ash">
          Les serveurs OpenStreetMap ne répondent pas pour le moment, et ce cimetière n&apos;a encore jamais été
          consulté sur RIP-Advisor. Réessayez dans quelques instants.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <RetryButton />
          <Link href="/" className={buttonStyles.secondary}>
            Retour à la carte
          </Link>
        </div>
      </div>
    );
  }

  const { cemetery } = lookup;
  const path = cemeteryPath(cemetery);
  const name = cemeteryName(cemetery);
  const [user, reviews] = await Promise.all([
    getCurrentUser(),
    createReviewService().then((service) => service.listForCemetery(cemetery.id)),
  ]);
  const ownReview = user ? reviews.find((r) => r.userId === user.id) : undefined;
  const otherReviews = ownReview ? reviews.filter((r) => r.id !== ownReview.id) : reviews;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <CemeteryHeader cemetery={cemetery} />

      <section
        aria-labelledby="donner-avis"
        // Their own review is already a card: no card inside a card.
        className={ownReview ? undefined : "rounded-xl border border-mist bg-tomb p-6 sm:p-8"}
      >
        {!user && (
          <>
            <h2 id="donner-avis" className="font-display text-xl font-bold">
              Vous y êtes passé ?
            </h2>
            <p className="mt-2 text-ash">Connectez-vous pour donner votre avis sur ce cimetière.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={loginUrlFor(path)} className={buttonStyles.primary}>
                Se connecter
              </Link>
              <Link href={`/inscription?next=${encodeURIComponent(path)}`} className={buttonStyles.secondary}>
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
              actions={<OwnReviewActions reviewId={ownReview.id} cemeteryName={name} />}
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
