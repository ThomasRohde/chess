import { describe, expect, it } from "vitest";

import { STARTING_FEN } from "../domain/chess/chessService";
import { decodePublishedState } from "../domain/state/urlCodec";
import {
  EXPECTED_FAMOUS_GAME_FINAL_ROW_COUNT,
  EXPECTED_FAMOUS_GAME_SEED_ROW_COUNT,
  FAMOUS_GAME_PLAYER_NAMES,
  FAMOUS_GAME_SEED_START,
  FAMOUS_GAMES,
  buildFamousGameSeedBranches,
} from "./famousGames";

describe("famous game seed data", () => {
  it("builds the expected famous-game branch rows", () => {
    const rows = buildFamousGameSeedBranches();

    expect(rows).toHaveLength(EXPECTED_FAMOUS_GAME_SEED_ROW_COUNT);
    expect(rows.filter((row) => row.is_final)).toHaveLength(EXPECTED_FAMOUS_GAME_FINAL_ROW_COUNT);
    expect([...new Set(rows.map((row) => row.published_by))].sort()).toEqual(
      [...FAMOUS_GAME_PLAYER_NAMES].sort(),
    );

    for (const game of FAMOUS_GAMES) {
      const gameRows = rows.filter((row) => row.gameKey === game.key);
      expect(gameRows).toHaveLength(game.expectedPlyCount);
      expect(gameRows.at(-1)).toMatchObject({
        gameTitle: game.title,
        is_final: true,
        status_kind: "checkmate",
      });
    }
  });

  it("generates linked payloads with real player names and deterministic timestamps", () => {
    const rows = buildFamousGameSeedBranches();
    const first = rows[0];
    const second = rows[1];
    const decodedFirst = decodePublishedState(first.payload);
    const decodedSecond = decodePublishedState(second.payload);

    expect(first).toMatchObject({
      gameKey: "opera-game",
      last_move_san: "e4",
      last_move_uci: "e2e4",
      parent_fen: STARTING_FEN,
      parent_payload: null,
      published_by: "Paul Morphy",
      recorded_at: FAMOUS_GAME_SEED_START,
      state_created_at: FAMOUS_GAME_SEED_START,
    });
    expect(second.parent_payload).toBe(first.payload);
    expect(second.parent_fen).toBe(first.fen);
    expect(second).toMatchObject({
      last_move_san: "e5",
      last_move_uci: "e7e5",
      published_by: "Duke Karl Count Isouard",
      recorded_at: "2026-05-03T00:01:00.000Z",
    });

    expect(decodedFirst).toEqual({
      ok: true,
      state: {
        createdAt: FAMOUS_GAME_SEED_START,
        fen: first.fen,
        lastMove: { san: "e4", uci: "e2e4" },
        publishedBy: "Paul Morphy",
        version: 1,
      },
    });
    expect(decodedSecond).toEqual({
      ok: true,
      state: {
        createdAt: "2026-05-03T00:01:00.000Z",
        fen: second.fen,
        lastMove: { san: "e5", uci: "e7e5" },
        publishedBy: "Duke Karl Count Isouard",
        version: 1,
      },
    });
  });
});
