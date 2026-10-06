"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, fieldErrorsFrom, INVALID_FORM, type FormState } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/session";
import { createReviewService } from "@/lib/services/factory";
import { cemeteryPath } from "@/lib/types";
import {
  createReviewSchema,
  deleteReviewSchema,
  RETURN_TO_CEMETERY_FIELD,
  reviewFieldsFromFormData,
  updateReviewSchema,
} from "@/lib/validation/review";

/*
 * Security, in three independent layers:
 *  1. identity re-checked here with auth.getUser() — user_id never comes from the form;
 *  2. zod validation of every field;
 *  3. RLS policies + SQL constraints (the service uses the user's session, never the admin client).
 */

const NOT_LOGGED_IN = "Vous devez être connecté.";

function revalidateReviewPages(): void {
  revalidatePath("/cimetieres/[osmType]/[osmId]", "page");
  revalidatePath("/mes-contributions");
}

export async function createReviewAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return fail(NOT_LOGGED_IN);

  const parsed = createReviewSchema.safeParse({
    ...reviewFieldsFromFormData(formData),
    cemeteryId: formData.get("cemeteryId"),
  });
  if (!parsed.success) return fail(INVALID_FORM, fieldErrorsFrom(parsed.error));

  const result = await (await createReviewService()).create(user.id, parsed.data);
  if (result.ok) revalidateReviewPages();
  return result;
}

export async function updateReviewAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return fail(NOT_LOGGED_IN);

  const parsed = updateReviewSchema.safeParse({
    ...reviewFieldsFromFormData(formData),
    reviewId: formData.get("reviewId"),
  });
  if (!parsed.success) return fail(INVALID_FORM, fieldErrorsFrom(parsed.error));

  const { result, cemetery } = await (await createReviewService()).update(user.id, parsed.data);
  if (!cemetery) return result;

  revalidateReviewPages();
  redirect(`${cemeteryPath(cemetery)}#mon-avis`);
}

export async function deleteReviewAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return fail(NOT_LOGGED_IN);

  const parsed = deleteReviewSchema.safeParse({ reviewId: formData.get("reviewId") });
  if (!parsed.success) return fail(INVALID_FORM, fieldErrorsFrom(parsed.error));

  const { result, cemetery } = await (await createReviewService()).delete(user.id, parsed.data.reviewId);
  if (!cemetery) return result;

  revalidateReviewPages();
  // The redirect target comes from the database, never from the form.
  if (formData.get(RETURN_TO_CEMETERY_FIELD) === "1") redirect(cemeteryPath(cemetery));
  return result;
}
