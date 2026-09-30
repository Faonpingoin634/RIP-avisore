const DEFAULT_PATH = "/";

/**
 * Returns `candidate` only if it is an internal path (starts with a single "/"),
 * otherwise "/". Prevents open redirects through the `?next=` parameter.
 */
export function safeNextPath(candidate: string | null | undefined): string {
  if (typeof candidate !== "string" || candidate.length === 0 || candidate.length > 2048) {
    return DEFAULT_PATH;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return DEFAULT_PATH;
  }
  // Control characters (tab, newline…) can be stripped by browsers and turn "/\t/evil" into "//evil".
  if (/[\u0000-\u001f\u007f\\]/.test(candidate)) {
    return DEFAULT_PATH;
  }
  return candidate;
}

/** Builds `/connexion?next=<path>` for a protected page. */
export function loginUrlFor(nextPath: string): string {
  return `/connexion?next=${encodeURIComponent(safeNextPath(nextPath))}`;
}
