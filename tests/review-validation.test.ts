import { describe, expect, it } from "vitest";

import { fieldErrorsFrom } from "@/lib/actions/result";
import {
  createReviewSchema,
  deleteReviewSchema,
  reviewFieldsFromFormData,
  updateReviewSchema,
} from "@/lib/validation/review";

const CEMETERY_ID = "5f0c6a2e-8a4b-4c1d-9e2f-3a4b5c6d7e8f";

const valid = {
  cemeteryId: CEMETERY_ID,
  rating: "4",
  humidity: "2",
  vibes: ["paisible", "gothique_chic"],
  comment: "Un voisinage d'un calme absolu, personne ne se plaint jamais.",
};

function errorsFor(input: Record<string, unknown>) {
  const result = createReviewSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.success ? {} : fieldErrorsFrom(result.error);
}

describe("createReviewSchema — accepted input", () => {
  it("coerces form strings and trims the comment", () => {
    const parsed = createReviewSchema.parse({ ...valid, comment: `   ${valid.comment}\n ` });
    expect(parsed.rating).toBe(4);
    expect(parsed.humidity).toBe(2);
    expect(parsed.comment).toBe(valid.comment);
  });

  it("accepts the bounds 1 and 5, one or three vibes", () => {
    expect(createReviewSchema.safeParse({ ...valid, rating: "1", humidity: "5", vibes: ["hante"] }).success).toBe(true);
    expect(
      createReviewSchema.safeParse({ ...valid, vibes: ["hante", "abandonne", "touristique"] }).success,
    ).toBe(true);
  });

  it("accepts exactly 10 and 2000 characters", () => {
    expect(createReviewSchema.safeParse({ ...valid, comment: "a".repeat(10) }).success).toBe(true);
    expect(createReviewSchema.safeParse({ ...valid, comment: "a".repeat(2000) }).success).toBe(true);
  });
});

describe("createReviewSchema — rejected input (§12)", () => {
  it.each(["0", "6", "-1", "3.5", "abc", "", null])("rejects rating %j", (rating) => {
    expect(errorsFor({ ...valid, rating }).rating).toBeDefined();
  });

  it.each(["0", "6", "2.5", null])("rejects humidity %j", (humidity) => {
    expect(errorsFor({ ...valid, humidity }).humidity).toBeDefined();
  });

  it("rejects 0 vibes", () => {
    expect(errorsFor({ ...valid, vibes: [] }).vibes).toBeDefined();
  });

  it("rejects 4 vibes", () => {
    expect(errorsFor({ ...valid, vibes: ["paisible", "hante", "abandonne", "touristique"] }).vibes).toBeDefined();
  });

  it("rejects an unknown vibe", () => {
    expect(errorsFor({ ...valid, vibes: ["paisible", "festif"] }).vibes).toBeDefined();
  });

  it("rejects duplicated vibes", () => {
    expect(errorsFor({ ...valid, vibes: ["hante", "hante"] }).vibes).toBeDefined();
  });

  it.each(["", "          ", "\n\t  \n", "   court   "])("rejects empty / blank / too short comment %j", (comment) => {
    expect(errorsFor({ ...valid, comment }).comment).toBeDefined();
  });

  it("rejects a comment over 2000 characters", () => {
    expect(errorsFor({ ...valid, comment: "a".repeat(2001) }).comment).toBeDefined();
  });

  it("counts characters like Postgres (an emoji is one character)", () => {
    // 5 emoji = 10 UTF-16 units but only 5 characters for Postgres' char_length.
    expect(errorsFor({ ...valid, comment: "👻👻👻👻👻" }).comment).toBeDefined();
  });

  it.each(["not-a-uuid", "", null, "1; drop table reviews"])("rejects cemeteryId %j", (cemeteryId) => {
    expect(errorsFor({ ...valid, cemeteryId }).cemeteryId).toBeDefined();
  });

  it("ignores any user_id sent by the client", () => {
    const parsed = createReviewSchema.parse({ ...valid, user_id: "someone-else", userId: "someone-else" });
    expect(parsed).not.toHaveProperty("user_id");
    expect(parsed).not.toHaveProperty("userId");
  });
});

describe("update / delete schemas", () => {
  it("require a review UUID", () => {
    const fields = { rating: valid.rating, humidity: valid.humidity, vibes: valid.vibes, comment: valid.comment };
    expect(updateReviewSchema.safeParse({ ...fields, reviewId: CEMETERY_ID }).success).toBe(true);
    expect(updateReviewSchema.safeParse({ ...fields, reviewId: "123" }).success).toBe(false);
    expect(deleteReviewSchema.safeParse({ reviewId: CEMETERY_ID }).success).toBe(true);
    expect(deleteReviewSchema.safeParse({ reviewId: "../etc" }).success).toBe(false);
  });
});

describe("reviewFieldsFromFormData", () => {
  it("reads multiple vibes from checkboxes", () => {
    const form = new FormData();
    form.set("rating", "3");
    form.set("humidity", "4");
    form.append("vibes", "paisible");
    form.append("vibes", "hante");
    form.set("comment", "Très bonne ambiance nocturne.");
    const parsed = createReviewSchema.parse({ ...reviewFieldsFromFormData(form), cemeteryId: CEMETERY_ID });
    expect(parsed.vibes).toEqual(["paisible", "hante"]);
  });
});
