import { describe, expect, it } from "vitest";

import { fieldErrorsFrom } from "@/lib/actions/result";
import { authErrorMessage, USERNAME_TAKEN } from "@/lib/services/auth-service";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

const valid = { username: "Morticia_42", email: "  Morticia@Example.COM ", password: "ombre-et-lumiere" };

describe("signUpSchema", () => {
  it("accepts a valid sign-up and normalises the email", () => {
    expect(signUpSchema.parse(valid)).toEqual({ ...valid, email: "morticia@example.com" });
  });

  it.each(["ab", "a".repeat(31), "élodie", "has space", "semi;colon", ""])("rejects username %j", (username) => {
    const result = signUpSchema.safeParse({ ...valid, username });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrorsFrom(result.error).username).toBeDefined();
  });

  it.each(["not-an-email", "", "a@", "@b.fr"])("rejects email %j", (email) => {
    expect(signUpSchema.safeParse({ ...valid, email }).success).toBe(false);
  });

  it("requires 8 to 72 characters of password", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "1234567" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: "12345678" }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...valid, password: "x".repeat(73) }).success).toBe(false);
  });

  it("rejects missing fields (FormData.get returns null)", () => {
    const result = signUpSchema.safeParse({ username: null, email: null, password: null });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrorsFrom(result.error)).sort()).toEqual(["email", "password", "username"]);
  });
});

describe("signInSchema", () => {
  it("requires an email and a non-empty password", () => {
    expect(signInSchema.safeParse({ email: "a@b.fr", password: "" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.fr", password: "x" }).success).toBe(true);
  });
});

describe("authErrorMessage", () => {
  it("translates known Supabase codes", () => {
    expect(authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe(
      "Email ou mot de passe incorrect.",
    );
    expect(authErrorMessage({ code: "user_already_exists", message: "" })).toMatch(/existe déjà/);
  });

  it("maps the profile trigger failure to 'username taken'", () => {
    expect(authErrorMessage({ code: "unexpected_failure", message: "Database error saving new user" })).toBe(USERNAME_TAKEN);
  });

  it("never leaks unknown raw messages", () => {
    const message = authErrorMessage({ code: "boom", message: 'duplicate key value violates unique constraint "x"' });
    expect(message).not.toMatch(/duplicate|constraint/);
  });
});
