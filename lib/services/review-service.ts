import { fail, ok, UNEXPECTED_ERROR, type ActionResult } from "@/lib/actions/result";
import {
  ReviewWriteError,
  type Review,
  type ReviewRepository,
  type ReviewWithCemetery,
} from "@/lib/repositories/review-repository";
import type { CreateReviewInput, ReviewFieldsInput, UpdateReviewInput } from "@/lib/validation/review";

export const NOT_FOUND_OR_FORBIDDEN = "Avis introuvable ou non autorisé.";
export const ALREADY_REVIEWED = "Vous avez déjà donné votre avis sur ce cimetière.";

/** Result of a mutation: the action result plus the cemetery to revalidate. */
export type ReviewMutation = { result: ActionResult; cemeteryId: string | null };

/** Maps Postgres error codes to messages. Raw database messages never reach the user. */
export function reviewErrorMessage(code: string | undefined): string {
  switch (code) {
    case "23505": // unique (cemetery_id, user_id)
      return ALREADY_REVIEWED;
    case "23503": // foreign key: cemetery or profile missing
      return "Ce cimetière est introuvable.";
    case "23514": // check constraint
    case "22P02": // invalid enum / number
      return "Votre avis contient une valeur invalide.";
    case "42501": // RLS or column privilege
      return NOT_FOUND_OR_FORBIDDEN;
    default:
      return UNEXPECTED_ERROR;
  }
}

function fieldsOf(input: ReviewFieldsInput) {
  return { rating: input.rating, humidity: input.humidity, vibes: input.vibes, comment: input.comment };
}

/**
 * Review use cases. `userId` always comes from `auth.getUser()` in the caller,
 * never from the form, and every write is scoped to it.
 */
export class ReviewService {
  constructor(private readonly repository: ReviewRepository) {}

  async create(userId: string, input: CreateReviewInput): Promise<ReviewMutation> {
    try {
      await this.repository.create(input.cemeteryId, userId, fieldsOf(input));
      return { result: ok(), cemeteryId: input.cemeteryId };
    } catch (error) {
      if (error instanceof ReviewWriteError && error.code === "23505") {
        const existing = await this.repository.findByAuthor(input.cemeteryId, userId);
        return {
          result: existing
            ? { ok: false, error: ALREADY_REVIEWED, link: { href: `/avis/${existing.id}/modifier`, label: "Modifier mon avis" } }
            : fail(ALREADY_REVIEWED),
          cemeteryId: input.cemeteryId,
        };
      }
      return { result: fail(this.messageFor(error, "create")), cemeteryId: null };
    }
  }

  async update(userId: string, input: UpdateReviewInput): Promise<ReviewMutation> {
    try {
      const cemeteryId = await this.repository.update(input.reviewId, userId, fieldsOf(input));
      return cemeteryId ? { result: ok(), cemeteryId } : { result: fail(NOT_FOUND_OR_FORBIDDEN), cemeteryId: null };
    } catch (error) {
      return { result: fail(this.messageFor(error, "update")), cemeteryId: null };
    }
  }

  async delete(userId: string, reviewId: string): Promise<ReviewMutation> {
    try {
      const cemeteryId = await this.repository.delete(reviewId, userId);
      return cemeteryId ? { result: ok(), cemeteryId } : { result: fail(NOT_FOUND_OR_FORBIDDEN), cemeteryId: null };
    } catch (error) {
      return { result: fail(this.messageFor(error, "delete")), cemeteryId: null };
    }
  }

  listForCemetery(cemeteryId: string): Promise<Review[]> {
    return this.repository.listForCemetery(cemeteryId);
  }

  findOwned(reviewId: string, userId: string): Promise<ReviewWithCemetery | null> {
    return this.repository.findOwned(reviewId, userId);
  }

  listByUser(userId: string): Promise<ReviewWithCemetery[]> {
    return this.repository.listByUser(userId);
  }

  private messageFor(error: unknown, operation: string): string {
    if (error instanceof ReviewWriteError) {
      console.error(`[reviews:${operation}] code=${error.code}`, error.message);
      return reviewErrorMessage(error.code);
    }
    console.error(`[reviews:${operation}]`, error);
    return UNEXPECTED_ERROR;
  }
}
