import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BRANCH_RECORD_PAGE_SIZE,
  countBranchRecords,
  isSupabaseConfigured,
  listBranchRecords,
  subscribeToBranchRecords,
} from "./branchRepository";
import type { BranchRecord } from "./branchTypes";

type UseBranchRecordsOptions = {
  isFinal?: boolean;
  statusKind?: BranchRecord["statusKind"] | null;
};

type BranchRecordsState = {
  branches: BranchRecord[];
  configured: boolean;
  counts: {
    finished: number;
    open: number;
  };
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loading: boolean;
  loadingMore: boolean;
};

export function useBranchRecords({
  isFinal,
  statusKind = null,
}: UseBranchRecordsOptions = {}): BranchRecordsState {
  const configured = isSupabaseConfigured();
  const query = useMemo(() => ({ isFinal, statusKind }), [isFinal, statusKind]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [counts, setCounts] = useState({ finished: 0, open: 0 });
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(configured);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextOffset = useRef(0);

  useEffect(() => {
    let ignore = false;

    if (!configured) {
      setBranches([]);
      setCounts({ finished: 0, open: 0 });
      setError(null);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      nextOffset.current = 0;
      return () => {
        ignore = true;
      };
    }

    nextOffset.current = 0;
    setLoading(true);
    setLoadingMore(false);
    Promise.all([
      countBranchRecords(),
      listBranchRecords({ ...query, limit: BRANCH_RECORD_PAGE_SIZE, offset: 0 }),
    ])
      .then(([recordCounts, page]) => {
        if (!ignore) {
          setBranches(page.branches);
          setCounts(recordCounts);
          setError(null);
          setHasMore(page.hasMore);
          nextOffset.current = page.branches.length;
        }
      })
      .catch((caught: unknown) => {
        if (!ignore) {
          setError(caught instanceof Error ? caught.message : "Games could not be loaded.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    const unsubscribe = subscribeToBranchRecords(
      (branch) => {
        setCounts((current) =>
          branch.isFinal
            ? { ...current, finished: current.finished + 1 }
            : { ...current, open: current.open + 1 },
        );

        if (!matchesQuery(branch, query)) {
          return;
        }

        setBranches((current) => {
          if (current.some((existing) => existing.payload === branch.payload)) {
            return current;
          }

          nextOffset.current += 1;
          return [branch, ...current];
        });
      },
      (subscriptionError) => setError(subscriptionError.message),
    );

    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [configured, query]);

  const loadMore = useCallback(async () => {
    if (!configured || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    try {
      const page = await listBranchRecords({
        ...query,
        limit: BRANCH_RECORD_PAGE_SIZE,
        offset: nextOffset.current,
      });
      setBranches((current) => mergeUniqueBranches([...current, ...page.branches]));
      setHasMore(page.hasMore);
      setError(null);
      nextOffset.current += page.branches.length;
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "More games could not be loaded.");
    } finally {
      setLoadingMore(false);
    }
  }, [configured, hasMore, loadingMore, query]);

  return { branches, configured, counts, error, hasMore, loadMore, loading, loadingMore };
}

function matchesQuery(branch: BranchRecord, query: UseBranchRecordsOptions): boolean {
  if (typeof query.isFinal === "boolean" && branch.isFinal !== query.isFinal) {
    return false;
  }

  return !query.statusKind || branch.statusKind === query.statusKind;
}

function mergeUniqueBranches(branches: BranchRecord[]): BranchRecord[] {
  const seenPayloads = new Set<string>();

  return branches.filter((branch) => {
    if (seenPayloads.has(branch.payload)) {
      return false;
    }

    seenPayloads.add(branch.payload);
    return true;
  });
}
