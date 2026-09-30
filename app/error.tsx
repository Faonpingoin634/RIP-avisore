"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Friendly fallback for unexpected server/network errors, with a retry. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-20 text-center">
      <p className="text-6xl" aria-hidden="true">👻</p>
      <h1 className="mt-4 font-display text-3xl font-bold">Un esprit frappeur a dérangé la page</h1>
      <p className="mt-3 text-ash">
        Une erreur inattendue est survenue (serveur ou connexion). Réessayez dans un instant.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-candle px-4 py-2 font-semibold text-crypt hover:bg-candle-dark"
        >
          Réessayer
        </button>
        <Link href="/" className="rounded-md border border-mist px-4 py-2 text-bone no-underline hover:bg-vault">
          Retour à la carte
        </Link>
      </div>
    </div>
  );
}
