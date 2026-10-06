/** A database read failed. Logged server-side; never shown raw to the user. */
export class RepositoryError extends Error {
  constructor(operation: string, cause: { message: string; code?: string }) {
    super(`${operation} : ${cause.message}`);
    this.name = "RepositoryError";
  }
}

/** Splits a list so that PostgREST `in (...)` filters keep URLs short. */
export function chunk<T>(items: readonly T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
