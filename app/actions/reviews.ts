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

  const { result } = await (await createReviewService()).create(user.id, parsed.data);
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

  const service = await createReviewService();
  const { result } = await service.update(user.id, parsed.data);
  if (!result.ok) return result;

  revalidateReviewPages();
  const updated = await service.findOwned(parsed.data.reviewId, user.id);
  redirect(updated ? `${cemeteryPath(updated.cemetery)}#mon-avis` : "/mes-contributions");
}

export async function deleteReviewAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return fail(NOT_LOGGED_IN);

  const parsed = deleteReviewSchema.safeParse({ reviewId: formData.get("reviewId") });
  if (!parsed.success) return fail(INVALID_FORM, fieldErrorsFrom(parsed.error));

  const { result } = await (await createReviewService()).delete(user.id, parsed.data.reviewId);
  if (result.ok) revalidateReviewPages();
  return result;
}
