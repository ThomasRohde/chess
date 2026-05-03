import { Chess } from "chess.js";

import { getGameStatus } from "../domain/chess/chessService";
import { createPublishedState } from "../domain/state/publishedState";
import { encodePublishedState } from "../domain/state/urlCodec";
import type { Database } from "../supabase/database.types";

type BranchInsert = Database["public"]["Tables"]["branches"]["Insert"];

export type FamousGameKey =
  | "opera-game"
  | "immortal-game"
  | "evergreen-game"
  | "game-of-the-century";

export type FamousGameDefinition = {
  expectedPlyCount: number;
  key: FamousGameKey;
  moves: readonly string[];
  title: string;
  white: string;
  black: string;
  year: number;
};

export type FamousGameSeedBranch = BranchInsert & {
  gameKey: FamousGameKey;
  gameTitle: string;
  ply: number;
};

export const FAMOUS_GAME_SEED_START = "2026-05-03T00:00:00.000Z";
export const FAMOUS_GAME_PLAYER_NAMES = [
  "Adolf Anderssen",
  "Donald Byrne",
  "Duke Karl Count Isouard",
  "Jean Dufresne",
  "Lionel Kieseritzky",
  "Paul Morphy",
  "Robert James Fischer",
] as const;

export const FAMOUS_GAMES = [
  {
    key: "opera-game",
    title: "Opera Game",
    white: "Paul Morphy",
    black: "Duke Karl Count Isouard",
    year: 1858,
    expectedPlyCount: 33,
    moves: [
      "e4",
      "e5",
      "Nf3",
      "d6",
      "d4",
      "Bg4",
      "dxe5",
      "Bxf3",
      "Qxf3",
      "dxe5",
      "Bc4",
      "Nf6",
      "Qb3",
      "Qe7",
      "Nc3",
      "c6",
      "Bg5",
      "b5",
      "Nxb5",
      "cxb5",
      "Bxb5+",
      "Nbd7",
      "O-O-O",
      "Rd8",
      "Rxd7",
      "Rxd7",
      "Rd1",
      "Qe6",
      "Bxd7+",
      "Nxd7",
      "Qb8+",
      "Nxb8",
      "Rd8#",
    ],
  },
  {
    key: "immortal-game",
    title: "Immortal Game",
    white: "Adolf Anderssen",
    black: "Lionel Kieseritzky",
    year: 1851,
    expectedPlyCount: 45,
    moves: [
      "e4",
      "e5",
      "f4",
      "exf4",
      "Bc4",
      "Qh4+",
      "Kf1",
      "b5",
      "Bxb5",
      "Nf6",
      "Nf3",
      "Qh6",
      "d3",
      "Nh5",
      "Nh4",
      "Qg5",
      "Nf5",
      "c6",
      "g4",
      "Nf6",
      "Rg1",
      "cxb5",
      "h4",
      "Qg6",
      "h5",
      "Qg5",
      "Qf3",
      "Ng8",
      "Bxf4",
      "Qf6",
      "Nc3",
      "Bc5",
      "Nd5",
      "Qxb2",
      "Bd6",
      "Bxg1",
      "e5",
      "Qxa1+",
      "Ke2",
      "Na6",
      "Nxg7+",
      "Kd8",
      "Qf6+",
      "Nxf6",
      "Be7#",
    ],
  },
  {
    key: "evergreen-game",
    title: "Evergreen Game",
    white: "Adolf Anderssen",
    black: "Jean Dufresne",
    year: 1852,
    expectedPlyCount: 47,
    moves: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "b4",
      "Bxb4",
      "c3",
      "Ba5",
      "d4",
      "exd4",
      "O-O",
      "d3",
      "Qb3",
      "Qf6",
      "e5",
      "Qg6",
      "Re1",
      "Nge7",
      "Ba3",
      "b5",
      "Qxb5",
      "Rb8",
      "Qa4",
      "Bb6",
      "Nbd2",
      "Bb7",
      "Ne4",
      "Qf5",
      "Bxd3",
      "Qh5",
      "Nf6+",
      "gxf6",
      "exf6",
      "Rg8",
      "Rad1",
      "Qxf3",
      "Rxe7+",
      "Nxe7",
      "Qxd7+",
      "Kxd7",
      "Bf5+",
      "Ke8",
      "Bd7+",
      "Kf8",
      "Bxe7#",
    ],
  },
  {
    key: "game-of-the-century",
    title: "Game of the Century",
    white: "Donald Byrne",
    black: "Robert James Fischer",
    year: 1956,
    expectedPlyCount: 82,
    moves: [
      "Nf3",
      "Nf6",
      "c4",
      "g6",
      "Nc3",
      "Bg7",
      "d4",
      "O-O",
      "Bf4",
      "d5",
      "Qb3",
      "dxc4",
      "Qxc4",
      "c6",
      "e4",
      "Nbd7",
      "Rd1",
      "Nb6",
      "Qc5",
      "Bg4",
      "Bg5",
      "Na4",
      "Qa3",
      "Nxc3",
      "bxc3",
      "Nxe4",
      "Bxe7",
      "Qb6",
      "Bc4",
      "Nxc3",
      "Bc5",
      "Rfe8+",
      "Kf1",
      "Be6",
      "Bxb6",
      "Bxc4+",
      "Kg1",
      "Ne2+",
      "Kf1",
      "Nxd4+",
      "Kg1",
      "Ne2+",
      "Kf1",
      "Nc3+",
      "Kg1",
      "axb6",
      "Qb4",
      "Ra4",
      "Qxb6",
      "Nxd1",
      "h3",
      "Rxa2",
      "Kh2",
      "Nxf2",
      "Re1",
      "Rxe1",
      "Qd8+",
      "Bf8",
      "Nxe1",
      "Bd5",
      "Nf3",
      "Ne4",
      "Qb8",
      "b5",
      "h4",
      "h5",
      "Ne5",
      "Kg7",
      "Kg1",
      "Bc5+",
      "Kf1",
      "Ng3+",
      "Ke1",
      "Bb4+",
      "Kd1",
      "Bb3+",
      "Kc1",
      "Ne2+",
      "Kb1",
      "Nc3+",
      "Kc1",
      "Rc2#",
    ],
  },
] as const satisfies readonly FamousGameDefinition[];

export const EXPECTED_FAMOUS_GAME_SEED_ROW_COUNT = FAMOUS_GAMES.reduce(
  (total, game) => total + game.expectedPlyCount,
  0,
);

export const EXPECTED_FAMOUS_GAME_FINAL_ROW_COUNT = FAMOUS_GAMES.length;

export function buildFamousGameSeedBranches({
  startAt = new Date(FAMOUS_GAME_SEED_START),
}: { startAt?: Date } = {}): FamousGameSeedBranch[] {
  const startAtMs = startAt.getTime();

  if (!Number.isFinite(startAtMs)) {
    throw new Error("Seed start timestamp is invalid.");
  }

  const rows: FamousGameSeedBranch[] = [];
  let globalPlyIndex = 0;

  for (const game of FAMOUS_GAMES) {
    const chess = new Chess();
    let parentPayload: string | null = null;

    if (game.moves.length !== game.expectedPlyCount) {
      throw new Error(`${game.title} has ${game.moves.length} moves, expected ${game.expectedPlyCount}.`);
    }

    for (const san of game.moves) {
      const beforeFen = chess.fen();
      const publishedBy = chess.turn() === "w" ? game.white : game.black;
      const move = chess.move(san);

      if (!move) {
        throw new Error(`${game.title} contains illegal move ${san}.`);
      }

      const afterFen = chess.fen();
      const recordedAt = new Date(startAtMs + globalPlyIndex * 60_000).toISOString();
      const lastMove = {
        san: move.san,
        uci: `${move.from}${move.to}${move.promotion ?? ""}`,
      };
      const state = createPublishedState({
        fen: afterFen,
        lastMove,
        now: new Date(recordedAt),
        publishedBy,
      });
      const payload = encodePublishedState(state);
      const status = getGameStatus(afterFen);

      rows.push({
        fen: afterFen,
        gameKey: game.key,
        gameTitle: game.title,
        is_final: status.isFinal,
        last_move_san: lastMove.san,
        last_move_uci: lastMove.uci,
        parent_fen: beforeFen,
        parent_payload: parentPayload,
        payload,
        ply: globalPlyIndex + 1,
        published_by: publishedBy,
        recorded_at: recordedAt,
        side_to_move: status.sideToMove,
        state_created_at: recordedAt,
        status_kind: status.kind,
        status_label: status.label,
      });

      parentPayload = payload;
      globalPlyIndex += 1;
    }

    if (!chess.isCheckmate()) {
      throw new Error(`${game.title} does not end in checkmate.`);
    }
  }

  return rows;
}
