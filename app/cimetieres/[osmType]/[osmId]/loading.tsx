export default function CemeteryLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8" aria-busy="true">
      <p role="status" className="text-center text-ash">
        <span aria-hidden="true" className="mr-2 inline-block animate-pulse">🕯️</span>
        Exhumation des données du cimetière…
      </p>
      <div className="h-56 animate-pulse rounded-xl border border-mist bg-tomb" />
      <div className="h-40 animate-pulse rounded-xl border border-mist bg-tomb" />
    </div>
  );
}
