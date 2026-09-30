import { describe, expect, it } from "vitest";

import {
  ReviewWriteError,
  type Review,
  type ReviewFields,
  type ReviewRepository,
} from "@/lib/repositories/review-repository";
import { ALREADY_REVIEWED, NOT_FOUND_OR_FORBIDDEN, ReviewService, reviewErrorMessage } from "@/lib/services/review-service";

const CEMETERY = "5f0c6a2e-8a4b-4c1d-9e2f-3a4b5c6d7e8f";
const REVIEW = "0b8f5d0e-1c2d-4e3f-8a9b-0c1d2e3f4a5b";
const ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const fields: ReviewFields = { rating: 4, humidity: 2, vibes: ["paisible"], comment: "Très calme, voisins discrets." };

/** In-memory stand-in for ReviewRepository reproducing the (id AND user_id) scoping. */
class FakeReviewRepository {
  rows: Array<{ id: string; cemeteryId: string; userId: string } & ReviewFields> = [];

  async create(cemeteryId: string, userId: string, f: ReviewFields): Promise<string> {
    if (this.rows.some((r) => r.cemeteryId === cemeteryId && r.userId === userId)) {
      throw new ReviewWriteError("23505", 'duplicate key value violates unique constraint "reviews_cemetery_id_user_id_key"');
    }
    this.rows.push({ id: REVIEW, cemeteryId, userId, ...f });
    return REVIEW;
  }

  async update(reviewId: string, userId: string, f: ReviewFields): Promise<string | null> {
    const row = this.rows.find((r) => r.id === reviewId && r.userId === userId);
    if (!row) return null;
    Object.assign(row, f);
    return row.cemeteryId;
  }

  async delete(reviewId: string, userId: string): Promise<string | null> {
    const index = this.rows.findIndex((r) => r.id === reviewId && r.userId === userId);
    if (index === -1) return null;
    const [row] = this.rows.splice(index, 1);
    return row.cemeteryId;
  }

  async findByAuthor(cemeteryId: string, userId: string): Promise<Review | null> {
    const row = this.rows.find((r) => r.cemeteryId === cemeteryId && r.userId === userId);
    return row
      ? { ...row, username: "alice", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
      : null;
  }
}

function setup() {
  const repository = new FakeReviewRepository();
  const service = new ReviewService(repository as unknown as ReviewRepository);
  return { repository, service };
}

describe("ReviewService", () => {
  it("creates a review for the authenticated user", async () => {
    const { repository, service } = setup();
    const { result, cemeteryId } = await service.create(ALICE, { cemeteryId: CEMETERY, ...fields });
    expect(result).toEqual({ ok: true });
    expect(cemeteryId).toBe(CEMETERY);
    expect(repository.rows[0].userId).toBe(ALICE);
  });

  it("refuses a second review on the same cemetery with a link to edit the first", async () => {
    const { service } = setup();
    await service.create(ALICE, { cemeteryId: CEMETERY, ...fields });
    const { result } = await service.create(ALICE, { cemeteryId: CEMETERY, ...fields });
    expect(result).toEqual({
      ok: false,
      error: ALREADY_REVIEWED,
      link: { href: `/avis/${REVIEW}/modifier`, label: "Modifier mon avis" },
    });
  });

  it("lets the author update and delete", async () => {
    const { repository, service } = setup();
    await service.create(ALICE, { cemeteryId: CEMETERY, ...fields });
    expect((await service.update(ALICE, { reviewId: REVIEW, ...fields, rating: 1 })).result.ok).toBe(true);
    expect(repository.rows[0].rating).toBe(1);
    expect((await service.delete(ALICE, REVIEW)).result.ok).toBe(true);
    expect(repository.rows).toHaveLength(0);
  });

  it("prevents user B from updating or deleting user A's review", async () => {
    const { repository, service } = setup();
    await service.create(ALICE, { cemeteryId: CEMETERY, ...fields });

    const update = await service.update(BOB, { reviewId: REVIEW, ...fields, rating: 1 });
    expect(update.result).toEqual({ ok: false, error: NOT_FOUND_OR_FORBIDDEN });
    const removal = await service.delete(BOB, REVIEW);
    expect(removal.result).toEqual({ ok: false, error: NOT_FOUND_OR_FORBIDDEN });

    expect(repository.rows).toHaveLength(1);
    expect(repository.rows[0].rating).toBe(4);
  });
});

describe("reviewErrorMessage", () => {
  it("maps Postgres codes without leaking raw messages", () => {
    expect(reviewErrorMessage("23505")).toBe(ALREADY_REVIEWED);
    expect(reviewErrorMessage("42501")).toBe(NOT_FOUND_OR_FORBIDDEN);
    expect(reviewErrorMessage("23514")).toMatch(/invalide/);
    expect(reviewErrorMessage("XX000")).not.toMatch(/XX000/);
  });
});
