import { describe, expect, it } from "vitest";

import {
  getGameStatus,
  requiresPromotion,
  STARTING_FEN,
  tryMove,
} from "./chessService";

describe("chessService", () => {
  it("accepts legal moves and returns SAN, UCI, and after-move FEN", () => {
    const result = tryMove(STARTING_FEN, "e2", "e4");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.move.san).toBe("e4");
      expect(result.move.uci).toBe("e2e4");
      expect(result.move.afterFen).toContain(" b ");
      expect(result.move.status.label).toBe("Black to move.");
    }
  });

  it("rejects illegal moves", () => {
    expect(tryMove(STARTING_FEN, "e2", "e5")).toEqual({
      ok: false,
      reason: "illegal",
    });
  });

  it("handles castling", () => {
    const result = tryMove("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", "e1", "g1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.move.san).toBe("O-O");
    }
  });

  it("handles en passant", () => {
    const result = tryMove(
      "rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3",
      "e5",
      "d6",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.move.san).toBe("exd6");
    }
  });

  it("requires an explicit promotion piece", () => {
    const fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";

    expect(requiresPromotion(fen, "a7", "a8")).toBe(true);

    const result = tryMove(fen, "a7", "a8", "q");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.move.uci).toBe("a7a8q");
    }
  });

  it("detects checkmate", () => {
    const status = getGameStatus(
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
    );

    expect(status.kind).toBe("checkmate");
    expect(status.isFinal).toBe(true);
  });

  it("detects stalemate", () => {
    const status = getGameStatus("7k/5K2/6Q1/8/8/8/8/8 b - - 0 1");

    expect(status.kind).toBe("stalemate");
    expect(status.isFinal).toBe(true);
  });
});
