"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="rounded-md bg-candle px-4 py-2 font-semibold text-crypt hover:bg-candle-dark disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Nouvel essai…" : "Réessayer"}
    </button>
  );
}
