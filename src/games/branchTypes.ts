import type { Database } from "../supabase/database.types";

export type BranchRow = Database["public"]["Tables"]["branches"]["Row"];

export type BranchRecord = {
  id: string;
  payload: string;
  parentPayload: string | null;
  parentFen: string;
  fen: string;
  publishedBy: string;
  lastMoveUci: string;
  lastMoveSan: string;
  statusKind: BranchRow["status_kind"];
  statusLabel: string;
  sideToMove: BranchRow["side_to_move"];
  isFinal: boolean;
  stateCreatedAt: string;
  recordedAt: string;
};

export function mapBranchRow(row: BranchRow): BranchRecord {
  return {
    id: row.id,
    payload: row.payload,
    parentPayload: row.parent_payload,
    parentFen: row.parent_fen,
    fen: row.fen,
    publishedBy: row.published_by,
    lastMoveUci: row.last_move_uci,
    lastMoveSan: row.last_move_san,
    statusKind: row.status_kind,
    statusLabel: row.status_label,
    sideToMove: row.side_to_move,
    isFinal: row.is_final,
    stateCreatedAt: row.state_created_at,
    recordedAt: row.recorded_at,
  };
}
