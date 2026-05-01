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
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded).not.toContain("=");
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

  it("preserves castling, en-passant, and move counters", () => {
    const state = createPublishedState({
      fen: "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 7 12",
      publishedBy: "Ada",
      lastMove: { uci: "f7f5", san: "f5" },
      now: new Date("2026-05-01T10:30:00.000Z"),
    });

    const decoded = decodePublishedState(encodePublishedState(state));

    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.state.fen).toBe(state.fen);
    }
  });

  it("produces meaningfully shorter payloads than raw FEN", () => {
    const state = createPublishedState({
      fen: STARTING_FEN,
      publishedBy: "Thomas",
      lastMove: null,
      now: new Date("2026-05-01T10:30:00.000Z"),
    });

    expect(encodePublishedState(state).length).toBeLessThan(STARTING_FEN.length);
  });

  it("rejects malformed binary payloads", () => {
    expect(decodePublishedState("not-valid")).toEqual({
      ok: false,
      reason: "invalid-binary",
    });
  });

  it("rejects truncated binary states", () => {
    expect(decodePublishedState("Ag")).toEqual({
      ok: false,
      reason: "invalid-binary",
    });
  });

  it("rejects oversized encoded payloads", () => {
    expect(decodePublishedState("a".repeat(513))).toEqual({
      ok: false,
      reason: "oversized",
    });
  });
});
