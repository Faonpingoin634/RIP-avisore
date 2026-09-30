import { z } from "zod";

import { VIBE_VALUES } from "@/lib/vibes";

export const COMMENT_MIN = 10;
export const COMMENT_MAX = 2000;
export const VIBES_MIN = 1;
export const VIBES_MAX = 3;

/** Characters as Postgres counts them (code points, so an emoji counts as 1). */
const charCount = (text: string) => [...text].length;

const score = (label: string) =>
  z.coerce
    .number({ error: `${label} : choisissez une note de 1 à 5.` })
    .int({ error: `${label} : choisissez une note de 1 à 5.` })
    .min(1, { error: `${label} : choisissez une note de 1 à 5.` })
    .max(5, { error: `${label} : choisissez une note de 1 à 5.` });

/** Fields shared by creation and update. Used on the client for comfort, and ALWAYS re-checked on the server. */
export const reviewFieldsSchema = z.object({
  rating: score("Note"),
  humidity: score("Humidité"),
  vibes: z
    .array(z.enum(VIBE_VALUES, { error: "Ambiance inconnue." }), { error: "Choisissez au moins une ambiance." })
    .min(VIBES_MIN, { error: "Choisissez au moins une ambiance." })
    .max(VIBES_MAX, { error: `Choisissez au maximum ${VIBES_MAX} ambiances.` })
    .refine((vibes) => new Set(vibes).size === vibes.length, { error: "Chaque ambiance ne peut être choisie qu'une fois." }),
  comment: z
    .string({ error: "Le commentaire est obligatoire." })
    .trim()
    .refine((text) => charCount(text) >= COMMENT_MIN, {
      error: `Le commentaire doit contenir au moins ${COMMENT_MIN} caractères (hors espaces au début et à la fin).`,
    })
    .refine((text) => charCount(text) <= COMMENT_MAX, {
      error: `Le commentaire ne peut pas dépasser ${COMMENT_MAX} caractères.`,
    }),
});

const uuid = (label: string) => z.uuid({ error: `${label} invalide.` });

export const createReviewSchema = reviewFieldsSchema.extend({ cemeteryId: uuid("Cimetière") });
export const updateReviewSchema = reviewFieldsSchema.extend({ reviewId: uuid("Avis") });
export const deleteReviewSchema = z.object({ reviewId: uuid("Avis") });

export type ReviewFieldsInput = z.infer<typeof reviewFieldsSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/** Reads the raw review fields from a submitted form (validation happens afterwards). */
export function reviewFieldsFromFormData(formData: FormData) {
  return {
    rating: formData.get("rating"),
    humidity: formData.get("humidity"),
    vibes: formData.getAll("vibes"),
    comment: formData.get("comment"),
  };
}
