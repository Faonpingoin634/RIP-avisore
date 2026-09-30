"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** "Connexion" / "Inscription" links that bring the visitor back to the current page. */
export default function AuthLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onAuthPage = pathname === "/connexion" || pathname === "/inscription";
  const current = onAuthPage ? (searchParams.get("next") ?? "/") : `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const next = encodeURIComponent(current);

  return (
    <>
      <Link href={`/connexion?next=${next}`} className="rounded-md px-3 py-1.5 text-bone no-underline hover:bg-vault">
        Connexion
      </Link>
      <Link
        href={`/inscription?next=${next}`}
        className="rounded-md bg-candle px-3 py-1.5 font-semibold text-crypt no-underline hover:bg-candle-dark"
      >
        Inscription
      </Link>
    </>
  );
}
