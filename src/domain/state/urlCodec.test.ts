import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";

import { STARTING_FEN } from "../chess/chessService";
import { createPublishedState } from "./publishedState";
import { decodePublishedState, encodePublishedState } from "./urlCodec";

describe("urlCodec", () => {
  it("round-trips a published state", () => {
    const state = createPublishedState({
      fen: STARTING_FEN,
      publishedBy: "Thomas",
      lastMove: null,
      now: new Date("2026-05-01T10:30:00.000Z"),
    });

    const encoded = encodePublishedState(state);
    const decoded = decodePublishedState(encoded);

    expect(decoded).toEqual({ ok: true, state });
  });

  it("preserves last move metadata", () => {
    const state = createPublishedState({
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      publishedBy: "Ada",
      lastMove: { uci: "e2e4", san: "e4" },
      now: new Date("2026-05-01T10:30:00.000Z"),
    });

    const decoded = decodePublishedState(encodePublishedState(state));

    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.state.lastMove).toEqual({ uci: "e2e4", san: "e4" });
    }
  });

  it("rejects unsupported versions", () => {
    const encoded = compressToEncodedURIComponent(JSON.stringify({ v: 2 }));

    expect(decodePublishedState(encoded)).toEqual({
      ok: false,
      reason: "unsupported-version",
    });
  });

  it("rejects invalid JSON", () => {
    const encoded = compressToEncodedURIComponent("{");

    expect(decodePublishedState(encoded)).toEqual({
      ok: false,
      reason: "invalid-json",
    });
  });

  it("rejects invalid FEN", () => {
    const encoded = compressToEncodedURIComponent(
      JSON.stringify({
        v: 1,
        f: "not a fen",
        by: "Ada",
        at: "2026-05-01T10:30:00.000Z",
      }),
    );

    expect(decodePublishedState(encoded)).toEqual({
      ok: false,
      reason: "invalid-schema",
    });
  });

  it("rejects oversized encoded payloads", () => {
    expect(decodePublishedState("a".repeat(4097))).toEqual({
      ok: false,
      reason: "oversized",
    });
  });
});
