import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Activity, CircleDot, GitBranch, Trophy } from "lucide-react";

import { ChessBoardView } from "../components/Board/ChessBoardView";
import { AppHeader } from "../components/Layout/AppHeader";
import {
  buildBranchTree,
  countChildren,
  filterFinishedBranches,
  filterOpenBranches,
  flattenBranchTree,
} from "../games/branchTree";
import type { BranchRecord } from "../games/branchTypes";
import { useBranchRecords } from "../games/useBranchRecords";

type GamesPageProps = {
  mode: "open" | "finished";
};

type FinishedFilter = "all" | "checkmate" | "stalemate" | "draw";

export function GamesPage({ mode }: GamesPageProps) {
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null);
  const [finishedFilter, setFinishedFilter] = useState<FinishedFilter>("all");
  const statusKind = mode === "finished" && finishedFilter !== "all" ? finishedFilter : null;
  const { branches, configured, counts, error, hasMore, loadMore, loading, loadingMore } =
    useBranchRecords({
      isFinal: mode === "finished",
      statusKind,
    });

  const childCounts = useMemo(() => countChildren(branches), [branches]);
  const openBranches = useMemo(() => filterOpenBranches(branches), [branches]);
  const finishedBranches = useMemo(() => filterFinishedBranches(branches), [branches]);
  const visibleBranches = useMemo(() => {
    if (mode === "open") {
      return openBranches;
    }

    if (finishedFilter === "all") {
      return finishedBranches;
    }

    return finishedBranches.filter((branch) => branch.statusKind === finishedFilter);
  }, [finishedBranches, finishedFilter, mode, openBranches]);
  const totalVisibleCount =
    mode === "open" ? counts.open : finishedFilter === "all" ? counts.finished : null;

  const flatBranches = useMemo(() => {
    if (mode === "finished") {
      return [...visibleBranches]
        .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
        .map((branch) => ({ branch, children: [], depth: 0 }));
    }

    return flattenBranchTree(buildBranchTree(visibleBranches));
  }, [mode, visibleBranches]);

  const selectedBranch =
    visibleBranches.find((branch) => branch.payload === selectedPayload) ??
    flatBranches[0]?.branch ??
    null;

  useEffect(() => {
    if (!selectedBranch) {
      setSelectedPayload(null);
      return;
    }

    if (selectedPayload !== selectedBranch.payload) {
      setSelectedPayload(selectedBranch.payload);
    }
  }, [selectedBranch, selectedPayload]);

  const title = mode === "open" ? "Games in play" : "Finished games";
  const subtitle =
    mode === "open"
      ? "Live published branches that can still be continued."
      : "Terminal branches recorded by checkmate, stalemate, or draw.";
  const Icon = mode === "open" ? Activity : Trophy;

  return (
    <main className="app-shell">
      <AppHeader />

      <section className="browser-intro" aria-labelledby="game-browser-title">
        <div>
          <p className="eyebrow">
            <Icon aria-hidden="true" size={16} />
            Branch browser
          </p>
          <h1 id="game-browser-title">{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="browser-stats" aria-label="Branch counts">
          <span>
            <CircleDot aria-hidden="true" size={17} />
            {counts.open} in play
          </span>
          <span>
            <Trophy aria-hidden="true" size={17} />
            {counts.finished} finished
          </span>
        </div>
      </section>

      {!configured ? (
        <section className="side-panel-card browser-empty" role="status">
          <div className="card-kicker">Supabase not configured</div>
          <p className="muted">
            Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to view recorded games.
          </p>
        </section>
      ) : (
        <section className="browser-layout">
          <section className="branch-list-panel" aria-label={title}>
            {mode === "finished" ? (
              <div className="filter-row" aria-label="Finished game filter">
                {(["all", "checkmate", "stalemate", "draw"] as const).map((filter) => (
                  <button
                    className={filter === finishedFilter ? "filter-button active" : "filter-button"}
                    key={filter}
                    onClick={() => setFinishedFilter(filter)}
                    type="button"
                  >
                    {filterLabel(filter)}
                  </button>
                ))}
              </div>
            ) : null}

            <p className="branch-list-summary">
              {loading
                ? "Preparing game list"
                : totalVisibleCount === null
                  ? `Showing ${flatBranches.length} filtered ${flatBranches.length === 1 ? "game" : "games"}`
                  : `Showing ${flatBranches.length} of ${totalVisibleCount} ${totalVisibleCount === 1 ? "game" : "games"}`}
            </p>

            {loading ? <p className="muted branch-message">Loading games...</p> : null}
            {error ? (
              <p className="form-error branch-message" role="alert">
                {error}
              </p>
            ) : null}
            {!loading && !error && flatBranches.length === 0 ? (
              <p className="muted branch-message">
                {mode === "open" ? "No games are in play yet." : "No finished games yet."}
              </p>
            ) : null}

            <div className="branch-list-scroll">
              <div className="branch-list">
                {flatBranches.map((node) => (
                  <button
                    className={
                      selectedBranch?.payload === node.branch.payload
                        ? "branch-row active"
                        : "branch-row"
                    }
                    key={node.branch.payload}
                    onClick={() => setSelectedPayload(node.branch.payload)}
                    style={{ "--branch-depth": node.depth } as CSSProperties}
                    type="button"
                  >
                    <span className={`status-pill ${node.branch.statusKind}`}>
                      {node.branch.statusKind}
                    </span>
                    <strong>{node.branch.lastMoveSan}</strong>
                    <span>{node.branch.publishedBy}</span>
                    <small>{formatTimestamp(node.branch.recordedAt)}</small>
                    <small>
                      {childCounts.get(node.branch.payload) ?? 0}{" "}
                      {(childCounts.get(node.branch.payload) ?? 0) === 1 ? "child" : "children"}
                    </small>
                  </button>
                ))}
              </div>
              {hasMore ? (
                <button
                  className="button secondary full-width branch-load-more"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  type="button"
                >
                  {loadingMore ? "Loading more games..." : "Load more games"}
                </button>
              ) : null}
            </div>
          </section>

          <aside className="branch-detail-panel" aria-label="Selected branch">
            {selectedBranch ? (
              <BranchDetail branch={selectedBranch} childCount={childCounts.get(selectedBranch.payload) ?? 0} />
            ) : (
              <section className="side-panel-card">
                <div className="card-kicker">No branch selected</div>
                <p className="muted">Select a recorded branch to inspect the board.</p>
              </section>
            )}
          </aside>
        </section>
      )}
    </main>
  );
}

function BranchDetail({ branch, childCount }: { branch: BranchRecord; childCount: number }) {
  return (
    <>
      <section className="branch-preview">
        <ChessBoardView disabled fen={branch.fen} onMove={() => false} pendingMove={null} />
      </section>
      <section className="side-panel-card">
        <div className="card-kicker">
          <GitBranch aria-hidden="true" size={16} />
          Selected branch
        </div>
        <p className="move-san">{branch.lastMoveSan}</p>
        <dl className="move-details branch-detail-grid">
          <div>
            <dt>Status</dt>
            <dd>{branch.statusLabel}</dd>
          </div>
          <div>
            <dt>Side</dt>
            <dd>{branch.sideToMove}</dd>
          </div>
          <div>
            <dt>By</dt>
            <dd>{branch.publishedBy}</dd>
          </div>
          <div>
            <dt>Children</dt>
            <dd>{childCount}</dd>
          </div>
          <div>
            <dt>UCI</dt>
            <dd>{branch.lastMoveUci}</dd>
          </div>
          <div>
            <dt>Recorded</dt>
            <dd>{formatTimestamp(branch.recordedAt)}</dd>
          </div>
        </dl>
        <Link className="button primary full-width" to={`/${branch.payload}`}>
          Open playable branch
        </Link>
      </section>
    </>
  );
}

function filterLabel(filter: FinishedFilter): string {
  if (filter === "all") {
    return "All";
  }

  return filter[0].toUpperCase() + filter.slice(1);
}

function formatTimestamp(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "recently";
  }
}
