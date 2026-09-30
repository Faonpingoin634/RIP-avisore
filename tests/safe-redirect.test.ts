import { describe, expect, it } from "vitest";

import { loginUrlFor, safeNextPath } from "@/lib/auth/safe-redirect";

describe("safeNextPath", () => {
  it.each(["/", "/mes-contributions", "/cimetieres/way/123?x=1#avis"])("accepts internal path %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\\/evil.example",
    "javascript:alert(1)",
    "mes-contributions",
    `/${"a".repeat(3000)}`,
  ])("rejects %s", (path) => {
    expect(safeNextPath(path)).toBe("/");
  });
});

describe("loginUrlFor", () => {
  it("encodes the return path", () => {
    expect(loginUrlFor("/cimetieres/way/1")).toBe("/connexion?next=%2Fcimetieres%2Fway%2F1");
  });

  it("neutralises external targets", () => {
    expect(loginUrlFor("//evil.example")).toBe("/connexion?next=%2F");
  });
});
