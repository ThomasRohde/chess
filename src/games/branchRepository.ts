import type { RealtimeChannel } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "../supabase/client";
import { mapBranchRow, type BranchRecord, type BranchRow } from "./branchTypes";

export const BRANCH_RECORD_PAGE_SIZE = 100;

export type BranchRecordQuery = {
  isFinal?: boolean;
  limit?: number;
  offset?: number;
  statusKind?: BranchRecord["statusKind"] | null;
};

export type BranchRecordPage = {
  branches: BranchRecord[];
  hasMore: boolean;
};

export type BranchRecordCounts = {
  finished: number;
  open: number;
};

export async function listBranchRecords({
  isFinal,
  limit = BRANCH_RECORD_PAGE_SIZE,
  offset = 0,
  statusKind = null,
}: BranchRecordQuery = {}): Promise<BranchRecordPage> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { branches: [], hasMore: false };
  }

  let query = supabase.from("branches").select("*");

  if (typeof isFinal === "boolean") {
    query = query.eq("is_final", isFinal);
  }

  if (statusKind) {
    query = query.eq("status_kind", statusKind);
  }

  const { data, error } = await query
    .order("recorded_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  return {
    branches: rows.slice(0, limit).map(mapBranchRow),
    hasMore: rows.length > limit,
  };
}

export async function countBranchRecords(): Promise<BranchRecordCounts> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { finished: 0, open: 0 };
  }

  const [openResult, finishedResult] = await Promise.all([
    supabase.from("branches").select("*", { count: "exact", head: true }).eq("is_final", false),
    supabase.from("branches").select("*", { count: "exact", head: true }).eq("is_final", true),
  ]);

  if (openResult.error) {
    throw new Error(openResult.error.message);
  }

  if (finishedResult.error) {
    throw new Error(finishedResult.error.message);
  }

  return {
    finished: finishedResult.count ?? 0,
    open: openResult.count ?? 0,
  };
}

export function subscribeToBranchRecords(
  onInsert: (branch: BranchRecord) => void,
  onError: (error: Error) => void,
): () => void {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return () => undefined;
  }

  const channel: RealtimeChannel = supabase
    .channel("branch-records")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "branches" },
      (payload) => {
        if (payload.new) {
          onInsert(mapBranchRow(payload.new as BranchRow));
        }
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onError(new Error(`Realtime subscription ${status.toLowerCase().replace("_", " ")}.`));
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export { isSupabaseConfigured };
