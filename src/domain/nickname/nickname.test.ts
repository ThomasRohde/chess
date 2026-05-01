import { describe, expect, it } from "vitest";

import { sanitizeNickname, validateNickname } from "./nickname";

describe("nickname", () => {
  it("trims, collapses spaces, strips unsupported characters, and caps length", () => {
    expect(sanitizeNickname("  Ada   Lovelace<script>abcdefghijk  ")).toBe(
      "Ada Lovelacescriptabcdef",
    );
  });

  it("rejects empty nicknames after sanitization", () => {
    expect(validateNickname("   🧪   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("accepts ASCII nicknames with spaces, hyphens, and underscores", () => {
    expect(validateNickname("Branch_Player-1")).toEqual({
      ok: true,
      value: "Branch_Player-1",
    });
  });
});
