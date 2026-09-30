import type { ReactNode } from "react";

/** Centered, single-column card used by the auth pages. */
export default function PageCard({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-xl border border-mist bg-tomb p-6 shadow-xl">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {intro && <p className="mt-2 text-ash">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
