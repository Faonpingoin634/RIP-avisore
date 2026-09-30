const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** True when the review was edited after its creation. */
export function isEdited(createdAt: string, updatedAt: string): boolean {
  return new Date(updatedAt).getTime() > new Date(createdAt).getTime();
}

/** Only http(s) links coming from OSM tags are rendered (no `javascript:` etc.). */
export function safeExternalUrl(value: string | undefined): string | null {
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** OSM `wikipedia=fr:Titre` tag → Wikipedia URL. */
export function wikipediaUrl(tag: string | undefined): string | null {
  if (!tag) return null;
  const match = /^([a-z-]{2,12}):(.+)$/i.exec(tag.trim());
  if (!match) return null;
  return `https://${match[1].toLowerCase()}.wikipedia.org/wiki/${encodeURIComponent(match[2].trim().replace(/ /g, "_"))}`;
}
