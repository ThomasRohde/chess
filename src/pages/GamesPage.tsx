import {
  buildProxiedInstance,
  expandAllFeature,
  hotkeysCoreFeature,
  syncDataLoaderFeature,
  type ItemInstance,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction,
} from "react";
import { Link } from "react-router-dom";
import { Activity, ChevronDown, ChevronRight, CircleDot, GitBranch, GitFork, Trophy } from "lucide-react";

import { ChessBoardView } from "../components/Board/ChessBoardView";
import { AppHeader } from "../components/Layout/AppHeader";
import {
  buildBranchTreeData,
  filterFinishedBranches,
  filterOpenBranches,
  type BranchTreeData,
  type BranchTreeItem,
} from "../games/branchTree";
import type { BranchRecord } from "../games/branchTypes";
import { useBranchRecords } from "../games/useBranchRecords";

const MAX_VISIBLE_TREE_DEPTH = 8;
const VIRTUAL_BRANCH_ROW_HEIGHT = 54;
const VIRTUAL_OVERSCAN = 12;

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

  const treeData = useMemo(
    () =>
      buildBranchTreeData(visibleBranches, {
        flat: mode === "finished",
        sortDirection: mode === "finished" ? "desc" : "asc",
      }),
    [mode, visibleBranches],
  );
  const knownFolderIds = useRef<Set<string> | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>(() => treeData.expandedFolderIds);

  useEffect(() => {
    const nextFolderIds = new Set(treeData.expandedFolderIds);
    const previousFolderIds = knownFolderIds.current;

    setExpandedItems((current) => {
      const next = current.filter((id) => nextFolderIds.has(id));

      for (const id of treeData.expandedFolderIds) {
        if (!previousFolderIds || !previousFolderIds.has(id)) {
          next.push(id);
        }
      }

      const unique = [...new Set(next)];
      return arraysEqual(current, unique) ? current : unique;
    });

    knownFolderIds.current = nextFolderIds;
  }, [treeData]);

  const selectedBranch =
    (selectedPayload ? treeData.items[selectedPayload]?.record : null) ??
    firstBranchRecord(treeData) ??
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
  const selectedTreeItem = selectedBranch ? treeData.items[selectedBranch.payload] : null;

  return (
    <main className="app-shell games-shell">
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

            <BranchTreeBrowser
              error={error}
              expandedItems={expandedItems}
              hasMore={hasMore}
              loadMore={loadMore}
              loading={loading}
              loadingMore={loadingMore}
              mode={mode}
              selectedPayload={selectedBranch?.payload ?? null}
              setExpandedItems={setExpandedItems}
              setSelectedPayload={setSelectedPayload}
              title={title}
              totalVisibleCount={totalVisibleCount}
              treeData={treeData}
            />
          </section>

          <section className="branch-board-panel" aria-label="Board preview">
            {selectedBranch ? (
              <section className="branch-preview">
                <ChessBoardView disabled fen={selectedBranch.fen} onMove={() => false} pendingMove={null} />
              </section>
            ) : (
              <section className="side-panel-card">
                <div className="card-kicker">No branch selected</div>
                <p className="muted">Select a recorded branch to inspect the board.</p>
              </section>
            )}
          </section>

          <aside className="branch-detail-panel" aria-label="Selected branch">
            {selectedBranch && selectedTreeItem ? (
              <BranchDetail branch={selectedBranch} childCount={selectedTreeItem.directChildCount} />
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

type BranchTreeBrowserProps = {
  error: string | null;
  expandedItems: string[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loading: boolean;
  loadingMore: boolean;
  mode: GamesPageProps["mode"];
  selectedPayload: string | null;
  setExpandedItems: Dispatch<SetStateAction<string[]>>;
  setSelectedPayload: (payload: string) => void;
  title: string;
  totalVisibleCount: number | null;
  treeData: BranchTreeData;
};

function BranchTreeBrowser({
  error,
  expandedItems,
  hasMore,
  loadMore,
  loading,
  loadingMore,
  mode,
  selectedPayload,
  setExpandedItems,
  setSelectedPayload,
  title,
  totalVisibleCount,
  treeData,
}: BranchTreeBrowserProps) {
  const scrollParentRef = useRef<HTMLDivElement | null>(null);
  const tree = useTree<BranchTreeItem>({
    dataLoader: {
      getChildren: (itemId) => treeData.items[itemId]?.childrenIds ?? [],
      getItem: (itemId) => treeData.items[itemId],
    },
    features: [syncDataLoaderFeature, expandAllFeature, hotkeysCoreFeature],
    getItemName: (item) => {
      const treeItem = item.getItemData();
      if (!treeItem.record) {
        return "Branches";
      }

      return branchRowLabel(treeItem.record, treeItem.directChildCount, item.getItemMeta().level);
    },
    instanceBuilder: buildProxiedInstance,
    isItemFolder: (item) => item.getItemData().childrenIds.length > 0,
    onPrimaryAction: (item) => {
      const record = item.getItemData().record;
      if (record) {
        setSelectedPayload(record.payload);
      }
    },
    rootItemId: treeData.rootItemId,
    setExpandedItems,
    state: { expandedItems },
  });
  tree.scheduleRebuildTree();
  const treeItems = tree.getItems().filter((item) => item.getItemData().record);
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: treeItems.length,
    estimateSize: () => VIRTUAL_BRANCH_ROW_HEIGHT,
    getItemKey: (index) => treeItems[index]?.getId() ?? index,
    getScrollElement: () => scrollParentRef.current,
    initialRect: { height: 620, width: 500 },
    overscan: VIRTUAL_OVERSCAN,
  });
  const measuredVirtualRows = rowVirtualizer.getVirtualItems();
  const fallbackRowCount = Math.min(
    treeItems.length,
    Math.ceil(620 / VIRTUAL_BRANCH_ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2,
  );
  const virtualRows =
    measuredVirtualRows.length > 0
      ? measuredVirtualRows
      : Array.from({ length: fallbackRowCount }, (_, index) => ({
          index,
          key: treeItems[index]?.getId() ?? index,
          size: VIRTUAL_BRANCH_ROW_HEIGHT,
          start: index * VIRTUAL_BRANCH_ROW_HEIGHT,
        }));
  const loadedBranchCount = countBranchRecords(treeData);
  const treeContainerProps = tree.getContainerProps(mode === "open" ? "Branch tree" : "Result list");
  const { ref: treeContainerRef, ...containerProps } = treeContainerProps;

  return (
    <>
      <div className="branch-list-heading">
        <p className="card-kicker">
          <GitBranch aria-hidden="true" size={16} />
          {mode === "open" ? "Branch tree" : "Result list"}
        </p>
        <p className="branch-list-summary">
          {loading
            ? "Preparing branch tree"
            : totalVisibleCount === null
              ? `${loadedBranchCount} filtered ${loadedBranchCount === 1 ? "branch" : "branches"}`
              : `${loadedBranchCount} of ${totalVisibleCount} ${totalVisibleCount === 1 ? "branch" : "branches"} loaded`}
        </p>
      </div>

      <div className="branch-tree-toolbar" aria-label="Tree controls">
        <button className="tree-control-button" onClick={() => void tree.expandAll()} type="button">
          Expand all
        </button>
        <button className="tree-control-button" onClick={() => tree.collapseAll()} type="button">
          Collapse all
        </button>
      </div>

      {loading ? <p className="muted branch-message">Loading games...</p> : null}
      {error ? (
        <p className="form-error branch-message" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && loadedBranchCount === 0 ? (
        <p className="muted branch-message">
          {mode === "open" ? "No games are in play yet." : "No finished games yet."}
        </p>
      ) : null}

      <div className="branch-list-scroll" ref={scrollParentRef}>
        <div
          {...containerProps}
          className="branch-list"
          ref={treeContainerRef}
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {virtualRows.map((virtualRow) => {
            const item = treeItems[virtualRow.index];
            if (!item) {
              return null;
            }

            return (
              <BranchTreeRow
                item={item}
                key={virtualRow.key}
                selected={selectedPayload === item.getId()}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                virtualizerMeasureElement={rowVirtualizer.measureElement}
              />
            );
          })}
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
    </>
  );
}

type BranchTreeRowProps = {
  item: ItemInstance<BranchTreeItem>;
  selected: boolean;
  style: CSSProperties;
  virtualizerMeasureElement: (node: HTMLDivElement | null) => void;
};

function BranchTreeRow({ item, selected, style, virtualizerMeasureElement }: BranchTreeRowProps) {
  const treeItem = item.getItemData();
  const branch = treeItem.record;

  if (!branch) {
    return null;
  }

  const branchState = branchStateLabel(branch);
  const level = item.getItemMeta().level;
  const treePath = compactTreePath(treeItem.ancestorLines, level);
  const itemProps = item.getProps();
  const { ref: itemRef, onClick: _unusedOnClick, ...rowProps } = itemProps;
  const selectItem = () => {
    item.setFocused();
    item.primaryAction();
  };

  return (
    <div
      {...rowProps}
      aria-selected={selected}
      className={[
        "branch-row",
        selected ? "active" : "",
        treeItem.directChildCount > 0 ? "has-children" : "",
        branch.isFinal ? "final" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-index={item.getItemMeta().index}
      onClick={selectItem}
      onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectItem();
        }
      }}
      ref={(node) => {
        virtualizerMeasureElement(node);
        if (typeof itemRef === "function") {
          itemRef(node);
        }
      }}
      style={style}
    >
      <span className="branch-tree-gutter" aria-hidden="true">
        {treePath.hiddenDepth > 0 ? <span className="tree-depth-overflow">+{treePath.hiddenDepth}</span> : null}
        {treePath.lines.map((hasLine, index) => (
          <span className={hasLine ? "tree-line continues" : "tree-line"} key={`${item.getId()}-${index}`} />
        ))}
        <span
          className={[
            "tree-junction",
            treeItem.isLastSibling ? "last" : "",
            treeItem.directChildCount > 0 ? "has-children" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </span>
      <button
        aria-label={`${item.isExpanded() ? "Collapse" : "Expand"} ${branch.lastMoveSan}`}
        className={item.isFolder() ? "tree-disclosure" : "tree-disclosure leaf"}
        disabled={!item.isFolder()}
        onClick={(event) => {
          event.stopPropagation();
          item.setFocused();
          if (item.isExpanded()) {
            item.collapse();
          } else {
            item.expand();
          }
        }}
        type="button"
      >
        {item.isFolder() ? (
          item.isExpanded() ? (
            <ChevronDown aria-hidden="true" size={15} />
          ) : (
            <ChevronRight aria-hidden="true" size={15} />
          )
        ) : null}
      </button>
      <span className="branch-row-body">
        <span className="branch-row-title">
          <strong>{branch.lastMoveSan}</strong>
          {branchState ? <span className={`branch-state ${branch.statusKind}`}>{branchState}</span> : null}
        </span>
        <span className="branch-row-meta">
          {branch.publishedBy} · {formatRowTimestamp(branch.recordedAt)}
        </span>
      </span>
      <span className={treeItem.directChildCount > 0 ? "branch-count has-count" : "branch-count"}>
        <GitFork aria-hidden="true" size={14} />
        {treeItem.directChildCount > 0 ? treeItem.directChildCount : "leaf"}
      </span>
    </div>
  );
}

function BranchDetail({ branch, childCount }: { branch: BranchRecord; childCount: number }) {
  return (
    <section className="side-panel-card">
      <div className="card-kicker">
        <GitBranch aria-hidden="true" size={16} />
        Selected branch
      </div>
      <p className="move-san">{branch.lastMoveSan}</p>
      <dl className="move-details branch-detail-grid">
        <div className="branch-detail-wide">
          <dt>{branch.isFinal ? "Result" : "Turn"}</dt>
          <dd>{branch.statusLabel}</dd>
        </div>
        <div>
          <dt>By</dt>
          <dd>{branch.publishedBy}</dd>
        </div>
        <div>
          <dt>Direct children</dt>
          <dd>{childCount}</dd>
        </div>
        <div>
          <dt>Move</dt>
          <dd>{branch.lastMoveUci}</dd>
        </div>
        <div>
          <dt>Recorded</dt>
          <dd>{formatTimestamp(branch.recordedAt)}</dd>
        </div>
      </dl>
      <Link className="button primary full-width" to={`/${branch.payload}`}>
        Open branch
      </Link>
    </section>
  );
}

function filterLabel(filter: FinishedFilter): string {
  if (filter === "all") {
    return "All";
  }

  return filter[0].toUpperCase() + filter.slice(1);
}

function branchStateLabel(branch: BranchRecord): string | null {
  if (branch.statusKind === "active") {
    return null;
  }

  if (branch.statusKind === "check") {
    return "Check";
  }

  return branch.statusKind[0].toUpperCase() + branch.statusKind.slice(1);
}

function branchRowLabel(branch: BranchRecord, childCount: number, depth: number): string {
  const state = branchStateLabel(branch);
  const childLabel = childCount === 0 ? "leaf" : `${childCount} ${childCount === 1 ? "child" : "children"}`;
  const statePart = state ? `, ${state}` : "";

  return `${branch.lastMoveSan}, ${branch.publishedBy}, ${formatRowTimestamp(branch.recordedAt)}, ${childLabel}, depth ${depth}${statePart}`;
}

function compactTreePath(ancestorLines: boolean[], depth: number): { hiddenDepth: number; lines: boolean[] } {
  const hiddenDepth = Math.max(0, depth - MAX_VISIBLE_TREE_DEPTH);

  return {
    hiddenDepth,
    lines: hiddenDepth > 0 ? ancestorLines.slice(hiddenDepth) : ancestorLines,
  };
}

function countBranchRecords(treeData: BranchTreeData): number {
  return Object.values(treeData.items).filter((item) => item.record).length;
}

function firstBranchRecord(treeData: BranchTreeData): BranchRecord | null {
  const firstItemId = treeData.items[treeData.rootItemId].childrenIds[0];
  return firstItemId ? treeData.items[firstItemId]?.record ?? null : null;
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatRowTimestamp(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
    }).format(new Date(value));
  } catch {
    return "recently";
  }
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
