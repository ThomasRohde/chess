import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BranchRecord } from "../games/branchTypes";
import { useBranchRecords } from "../games/useBranchRecords";
import { GamesPage } from "./GamesPage";

vi.mock("../components/Board/ChessBoardView", () => ({
  ChessBoardView: ({ fen }: { fen: string }) => <div data-testid="board-preview">{fen}</div>,
}));

vi.mock("../games/useBranchRecords", () => ({
  useBranchRecords: vi.fn(),
}));

const mockedUseBranchRecords = vi.mocked(useBranchRecords);
let loadMore: ReturnType<typeof vi.fn>;

describe("GamesPage", () => {
  beforeEach(() => {
    loadMore = vi.fn();
    mockedUseBranchRecords.mockReturnValue({
      branches: [
        branch({ payload: "open-root", lastMoveSan: "e4", isFinal: false }),
        branch({
          payload: "finished-checkmate",
          lastMoveSan: "Qh4#",
          isFinal: true,
          statusKind: "checkmate",
          statusLabel: "Checkmate. Black wins.",
        }),
        branch({
          payload: "finished-draw",
          lastMoveSan: "Kxg7",
          isFinal: true,
          statusKind: "draw",
          statusLabel: "Draw.",
        }),
      ],
      configured: true,
      counts: { finished: 2, open: 1 },
      error: null,
      hasMore: false,
      loadMore: loadMore as unknown as () => Promise<void>,
      loading: false,
      loadingMore: false,
    });
  });

  it("shows only open branches on the games-in-play page", () => {
    render(
      <MemoryRouter>
        <GamesPage mode="open" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Games in play" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /e4/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Qh4#/i })).not.toBeInTheDocument();
    expect(screen.getByText("1 in play")).toBeInTheDocument();
    expect(screen.getByText("2 finished")).toBeInTheDocument();
  });

  it("filters finished games by status", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GamesPage mode="finished" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /Qh4#/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kxg7/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Draw" }));

    expect(screen.queryByRole("button", { name: /Qh4#/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kxg7/i })).toBeInTheDocument();
  });

  it("loads another page when more browser rows are available", async () => {
    const user = userEvent.setup();
    mockedUseBranchRecords.mockReturnValue({
      branches: [branch({ payload: "open-root", lastMoveSan: "e4", isFinal: false })],
      configured: true,
      counts: { finished: 0, open: 250 },
      error: null,
      hasMore: true,
      loadMore: loadMore as unknown as () => Promise<void>,
      loading: false,
      loadingMore: false,
    });

    render(
      <MemoryRouter>
        <GamesPage mode="open" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Showing 1 of 250 games")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load more games" }));

    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});

function branch(overrides: Partial<BranchRecord>): BranchRecord {
  return {
    id: overrides.payload ?? "id",
    payload: "payload",
    parentPayload: null,
    parentFen: "parent",
    fen: "fen",
    publishedBy: "Ada",
    lastMoveUci: "e2e4",
    lastMoveSan: "e4",
    statusKind: "active",
    statusLabel: "Black to move.",
    sideToMove: "black",
    isFinal: false,
    stateCreatedAt: "2026-05-01T10:00:00.000Z",
    recordedAt: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}
