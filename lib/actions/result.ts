import type { z } from "zod";

export type FieldErrors = Record<string, string[]>;

/** Uniform return type of every Server Action. Never carries raw database messages. */
export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: FieldErrors;
      /** Optional way out, e.g. "Modifier mon avis" after a duplicate review. */
      link?: { href: string; label: string };
    };

/** State held by `useActionState`: the last result (null before the first submit). */
export type FormState = ActionResult | null;

export const ok = (): ActionResult => ({ ok: true });

export const fail = (error: string, fieldErrors?: FieldErrors): ActionResult =>
  fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };

/** Converts a zod error into `{ field: [messages] }`. */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

export const INVALID_FORM = "Le formulaire contient des erreurs.";
export const UNEXPECTED_ERROR = "Une erreur inattendue est survenue. Réessayez dans un instant.";
