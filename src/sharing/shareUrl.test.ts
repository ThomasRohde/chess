import { describe, expect, it } from "vitest";

import { buildShareUrl, normalizeBasePath } from "./shareUrl";
import { buildXShareUrl } from "./xShare";

describe("share URL helpers", () => {
  it("normalizes GitHub Pages base paths", () => {
    expect(normalizeBasePath("chess")).toBe("/chess/");
    expect(normalizeBasePath("/chess")).toBe("/chess/");
    expect(normalizeBasePath("/chess/")).toBe("/chess/");
    expect(normalizeBasePath("/")).toBe("/");
  });

  it("builds absolute hash-route share URLs", () => {
    expect(buildShareUrl("abc", "https://example.com", "/chess/")).toBe(
      "https://example.com/chess/#/p/abc",
    );
  });

  it("builds X/Twitter intent URLs", () => {
    const url = buildXShareUrl({
      nickname: "Ada",
      moveSan: "Nf3",
      shareUrl: "https://example.com/chess/#/p/abc",
    });

    expect(url).toContain("https://twitter.com/intent/tweet?");
    const params = new URL(url).searchParams;
    expect(params.get("text")).toBe(
      ["♟️ Branch Chess", "", "Ada played Nf3.", "🌿 A new branch is live.", "", "Your move:"].join(
        "\n",
      ),
    );
    expect(params.get("hashtags")).toBe("BranchChess,Chess");
    expect(params.get("url")).toBe("https://example.com/chess/#/p/abc");
  });
});
