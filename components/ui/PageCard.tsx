import type { ReactNode } from "react";

import Ornament from "./Ornament";

/** Centered, single-column card used by the auth pages. */
export default function PageCard({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="rounded-xl border border-mist bg-tomb p-8">
        <h1 className="text-center font-display text-2xl font-bold">{title}</h1>
        {intro && <p className="mt-2 text-center text-ash">{intro}</p>}
        <Ornament className="my-6" />
        {children}
      </div>
    </div>
  );
}
