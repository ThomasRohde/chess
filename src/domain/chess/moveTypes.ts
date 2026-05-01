export type SideToMove = "white" | "black";

export type GameStatusKind = "active" | "check" | "checkmate" | "stalemate" | "draw";

export type GameStatus = {
  kind: GameStatusKind;
  label: string;
  sideToMove: SideToMove;
  isFinal: boolean;
};

export type AppliedMove = {
  beforeFen: string;
  afterFen: string;
  from: string;
  to: string;
  promotion?: string;
  uci: string;
  san: string;
  status: GameStatus;
};

export type MoveAttemptResult =
  | { ok: true; move: AppliedMove }
  | { ok: false; reason: "illegal" | "invalid-fen" };
