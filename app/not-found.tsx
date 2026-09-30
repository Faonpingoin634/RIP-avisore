import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cette tombe est vide",
  description: "La page demandée n'existe pas ou a été enterrée.",
};

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-20 text-center">
      <p className="text-6xl" aria-hidden="true">⚰️</p>
      <h1 className="mt-4 font-display text-3xl font-bold">Cette tombe est vide</h1>
      <p className="mt-3 text-ash">
        La page que vous cherchez n&apos;existe pas, ou ce lieu n&apos;est pas un cimetière dans OpenStreetMap.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-candle px-4 py-2 font-semibold text-crypt no-underline hover:bg-candle-dark"
      >
        Retour à la carte
      </Link>
    </div>
  );
}
