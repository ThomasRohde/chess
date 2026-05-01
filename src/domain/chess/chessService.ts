import { Chess } from "chess.js";

import type { GameStatus, MoveAttemptResult, SideToMove } from "./moveTypes";

export const STARTING_FEN = new Chess().fen();

const PROMOTION_PIECES = ["q", "r", "b", "n"] as const;

function sideName(turn: "w" | "b"): SideToMove {
  return turn === "w" ? "white" : "black";
}

function capitalizeSide(side: SideToMove): string {
  return side === "white" ? "White" : "Black";
}

export function loadChess(fen: string): Chess | null {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

export function isValidFen(fen: string): boolean {
  return loadChess(fen) !== null;
}

export function getGameStatus(fen: string): GameStatus {
  const chess = loadChess(fen);

  if (!chess) {
    return {
      kind: "draw",
      label: "Invalid board",
      sideToMove: "white",
      isFinal: true,
    };
  }

  const sideToMove = sideName(chess.turn());
  const sideLabel = capitalizeSide(sideToMove);

  if (chess.isCheckmate()) {
    const winner = sideToMove === "white" ? "Black" : "White";
    return {
      kind: "checkmate",
      label: `Checkmate. ${winner} wins.`,
      sideToMove,
      isFinal: true,
    };
  }

  if (chess.isStalemate()) {
    return {
      kind: "stalemate",
      label: "Stalemate.",
      sideToMove,
      isFinal: true,
    };
  }

  if (chess.isDraw()) {
    return {
      kind: "draw",
      label: "Draw.",
      sideToMove,
      isFinal: true,
    };
  }

  if (chess.isCheck()) {
    return {
      kind: "check",
      label: `${sideLabel} is in check.`,
      sideToMove,
      isFinal: false,
    };
  }

  return {
    kind: "active",
    label: `${sideLabel} to move.`,
    sideToMove,
    isFinal: false,
  };
}

export function canDragPiece(fen: string, piece: string): boolean {
  const chess = loadChess(fen);
  if (!chess || getGameStatus(fen).isFinal) {
    return false;
  }

  const pieceColor = piece[0];
  return pieceColor === chess.turn();
}

export function getLegalDestinations(fen: string, square: string): string[] {
  const chess = loadChess(fen);
  if (!chess) {
    return [];
  }

  return chess
    .moves({ square: square as never, verbose: true })
    .map((move) => move.to);
}

export function requiresPromotion(fen: string, from: string, to: string): boolean {
  const chess = loadChess(fen);
  if (!chess) {
    return false;
  }

  return chess.moves({ square: from as never, verbose: true }).some((move) => {
    return move.from === from && move.to === to && Boolean(move.promotion);
  });
}

export function tryMove(
  fen: string,
  from: string,
  to: string,
  promotion?: string,
): MoveAttemptResult {
  const chess = loadChess(fen);

  if (!chess) {
    return { ok: false, reason: "invalid-fen" };
  }

  const beforeFen = chess.fen();

  try {
    const move = chess.move({
      from,
      to,
      promotion: normalizePromotion(promotion),
    });

    if (!move) {
      return { ok: false, reason: "illegal" };
    }

    const afterFen = chess.fen();
    const promotionSuffix = move.promotion ?? normalizePromotion(promotion) ?? "";

    return {
      ok: true,
      move: {
        beforeFen,
        afterFen,
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        uci: `${move.from}${move.to}${promotionSuffix}`,
        san: move.san,
        status: getGameStatus(afterFen),
      },
    };
  } catch {
    return { ok: false, reason: "illegal" };
  }
}

function normalizePromotion(promotion?: string): string | undefined {
  if (!promotion) {
    return undefined;
  }

  const normalized = promotion.toLowerCase();
  return PROMOTION_PIECES.includes(normalized as (typeof PROMOTION_PIECES)[number])
    ? normalized
    : undefined;
}
