import Link from "next/link";
import { Suspense } from "react";

import { signOutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import AuthLinks from "./AuthLinks";

const linkClass = "rounded-md px-3 py-1.5 text-bone no-underline hover:bg-vault";

export default async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-mist bg-tomb">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5"
      >
        <Link href="/" className="font-display text-xl font-bold text-bone no-underline">
          <span aria-hidden="true">🪦 </span>RIP-Advisor
        </Link>

        <div className="flex flex-wrap items-center gap-1">
          <Link href="/" className={linkClass}>
            Carte
          </Link>
          {user ? (
            <>
              <Link href="/mes-contributions" className={linkClass}>
                Mes contributions
              </Link>
              <span className="px-2 text-ash">
                <span aria-hidden="true">👻 </span>
                <span className="sr-only">Connecté en tant que </span>
                <strong className="text-bone">{user.username}</strong>
              </span>
              <form action={signOutAction}>
                <button type="submit" className={`${linkClass} border border-mist`}>
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <Suspense fallback={null}>
              <AuthLinks />
            </Suspense>
          )}
        </div>
      </nav>
    </header>
  );
}
