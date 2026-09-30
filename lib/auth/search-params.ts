import { safeNextPath } from "./safe-redirect";

export type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Validated `?next=` parameter of the auth pages. */
export async function nextParam(searchParams: PageSearchParams): Promise<string> {
  const value = (await searchParams).next;
  return safeNextPath(Array.isArray(value) ? value[0] : value);
}
