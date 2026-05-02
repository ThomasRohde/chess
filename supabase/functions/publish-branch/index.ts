import { createClient } from "npm:@supabase/supabase-js@2";
import { Chess } from "npm:chess.js@1.4.0";

type SideToMove = "white" | "black";
type StatusKind = "active" | "check" | "checkmate" | "stalemate" | "draw";

type PublishedStateV1 = {
  version: 1;
  fen: string;
  publishedBy: string;
  lastMove: { uci: string; san: string } | null;
  createdAt: string;
};

type BranchRowInsert = {
  payload: string;
  parent_payload: string | null;
  parent_fen: string;
  fen: string;
  published_by: string;
  last_move_uci: string;
  last_move_san: string;
  status_kind: StatusKind;
  status_label: string;
  side_to_move: SideToMove;
  is_final: boolean;
  state_created_at: string;
};

type DecodeResult =
  | { ok: true; state: PublishedStateV1 }
  | { ok: false; reason: string };

type ValidationResult =
  | { ok: true; row: BranchRowInsert }
  | { ok: false; status: number; error: string };

const MAX_ENCODED_PAYLOAD_LENGTH = 512;
const BINARY_PAYLOAD_VERSION = 2;
const NO_EN_PASSANT_FILE = 8;
const FILES = "abcdefgh";
const PIECE_CODES = ["p", "n", "b", "r", "q"] as const;
const STARTING_FEN = new Chess().fen();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  if (!isAuthorized(request)) {
    return json({ error: "Unauthorized." }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const validation = validatePublishBranch(body);
  if (!validation.ok) {
    return json({ error: validation.error }, validation.status);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase service credentials are not configured." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("branches")
    .insert(validation.row)
    .select()
    .single();

  if (!error) {
    return json({ branch: data, created: true }, 201);
  }

  if (error.code === "23505") {
    const existing = await supabase
      .from("branches")
      .select()
      .eq("payload", validation.row.payload)
      .single();

    if (!existing.error) {
      return json({ branch: existing.data, created: false }, 200);
    }
  }

  console.error("Failed to publish branch", error);
  return json({ error: "Branch could not be recorded." }, 500);
});

function isAuthorized(request: Request): boolean {
  const allowedKeys = [
    Deno.env.get("SUPABASE_ANON_KEY"),
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
  ].filter((value): value is string => Boolean(value));

  if (allowedKeys.length === 0) {
    return false;
  }

  const apiKey = request.headers.get("apikey");
  const authorization = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return allowedKeys.some((allowedKey) => allowedKey === apiKey || allowedKey === authorization);
}

function validatePublishBranch(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return invalid("Request body must be an object.");
  }

  const payload = parsePayload(input.payload, "payload");
  if (!payload.ok) {
    return invalid(payload.error);
  }

  const parentPayload =
    input.parentPayload === null || typeof input.parentPayload === "undefined"
      ? { ok: true as const, value: null }
      : parsePayload(input.parentPayload, "parentPayload");

  if (!parentPayload.ok) {
    return invalid(parentPayload.error);
  }

  if (typeof input.parentFen !== "string") {
    return invalid("parentFen must be a FEN string.");
  }

  const child = decodePublishedState(payload.value);
  if (!child.ok) {
    return invalid(`payload is invalid: ${child.reason}.`);
  }

  const parentChess = loadChess(input.parentFen);
  if (!parentChess) {
    return invalid("parentFen is not a valid chess position.");
  }

  const parentFen = parentChess.fen();
  if (parentPayload.value) {
    const parent = decodePublishedState(parentPayload.value);
    if (!parent.ok || new Chess(parent.state.fen).fen() !== parentFen) {
      return invalid("parentPayload does not match parentFen.");
    }
  } else if (parentFen !== STARTING_FEN) {
    return invalid("parentPayload is required for non-starting positions.");
  }

  const state = child.state;
  if (!state.lastMove) {
    return invalid("payload must include the published move.");
  }

  const uci = parseUci(state.lastMove.uci);
  if (!uci) {
    return invalid("last move UCI is invalid.");
  }

  let move;
  try {
    move = parentChess.move(uci);
  } catch {
    return invalid("last move is illegal from parentFen.");
  }

  if (!move) {
    return invalid("last move is illegal from parentFen.");
  }

  const actualUci = `${move.from}${move.to}${move.promotion ?? ""}`;
  const childFen = new Chess(state.fen).fen();
  const afterFen = parentChess.fen();

  if (actualUci !== state.lastMove.uci || move.san !== state.lastMove.san || afterFen !== childFen) {
    return invalid("payload move metadata does not match the resulting position.");
  }

  const createdAt = new Date(state.createdAt);
  if (!Number.isFinite(createdAt.getTime()) || sanitizeNickname(state.publishedBy).length === 0) {
    return invalid("payload publisher or timestamp is invalid.");
  }

  const status = getGameStatus(afterFen);
  return {
    ok: true,
    row: {
      payload: payload.value,
      parent_payload: parentPayload.value,
      parent_fen: parentFen,
      fen: afterFen,
      published_by: sanitizeNickname(state.publishedBy),
      last_move_uci: actualUci,
      last_move_san: move.san,
      status_kind: status.kind,
      status_label: status.label,
      side_to_move: status.sideToMove,
      is_final: status.isFinal,
      state_created_at: createdAt.toISOString(),
    },
  };
}

function parsePayload(value: unknown, name: string): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: `${name} must be a string.` };
  }

  if (value.length === 0 || value.length > MAX_ENCODED_PAYLOAD_LENGTH || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    return { ok: false, error: `${name} is not a valid branch payload.` };
  }

  return { ok: true, value };
}

function parseUci(uci: string): { from: string; to: string; promotion?: string } | null {
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/u.exec(uci);
  if (!match) {
    return null;
  }

  return { from: match[1], to: match[2], promotion: match[3] };
}

function invalid(error: string): ValidationResult {
  return { ok: false, status: 400, error };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadChess(fen: string): Chess | null {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

function getGameStatus(fen: string): {
  kind: StatusKind;
  label: string;
  sideToMove: SideToMove;
  isFinal: boolean;
} {
  const chess = new Chess(fen);
  const sideToMove = chess.turn() === "w" ? "white" : "black";
  const sideLabel = sideToMove === "white" ? "White" : "Black";

  if (chess.isCheckmate()) {
    const winner = sideToMove === "white" ? "Black" : "White";
    return { kind: "checkmate", label: `Checkmate. ${winner} wins.`, sideToMove, isFinal: true };
  }

  if (chess.isStalemate()) {
    return { kind: "stalemate", label: "Stalemate.", sideToMove, isFinal: true };
  }

  if (chess.isDraw()) {
    return { kind: "draw", label: "Draw.", sideToMove, isFinal: true };
  }

  if (chess.isCheck()) {
    return { kind: "check", label: `${sideLabel} is in check.`, sideToMove, isFinal: false };
  }

  return { kind: "active", label: `${sideLabel} to move.`, sideToMove, isFinal: false };
}

function decodePublishedState(encoded: string): DecodeResult {
  if (encoded.length > MAX_ENCODED_PAYLOAD_LENGTH) {
    return { ok: false, reason: "oversized" };
  }

  let reader: BitReader;
  try {
    reader = new BitReader(base64UrlDecode(encoded));
  } catch {
    return { ok: false, reason: "invalid-binary" };
  }

  try {
    const version = reader.readNumber(3);
    if (version !== BINARY_PAYLOAD_VERSION) {
      return {
        ok: false,
        reason: version > BINARY_PAYLOAD_VERSION ? "unsupported-version" : "invalid-binary",
      };
    }

    const sideToMove = reader.readNumber(1) === 1 ? "b" : "w";
    const castling = maskToCastling(reader.readNumber(4));
    const enPassantFile = reader.readNumber(4);
    if (enPassantFile > NO_EN_PASSANT_FILE) {
      return { ok: false, reason: "invalid-schema" };
    }

    const occupancy = reader.readBigInt(64);
    let remaining = occupancy;
    const white = depositBits(reader.readBigInt(popcount(remaining)), remaining);
    const masks: PieceMasks = { occupancy, white, p: 0n, n: 0n, b: 0n, r: 0n, q: 0n };

    for (const code of PIECE_CODES) {
      masks[code] = depositBits(reader.readBigInt(popcount(remaining)), remaining);
      remaining &= ~masks[code];
    }

    reader.alignToByte();
    const halfmoveClock = reader.readVarUint();
    const fullmoveNumber = reader.readVarUint() + 1;
    const createdAtMs = reader.readVarUint();
    const publishedBy = sanitizeNickname(reader.readUtf8(48));
    const hasLastMove = reader.readNumber(1);
    reader.alignToByte();

    const lastMove = hasLastMove ? { uci: reader.readUtf8(8), san: reader.readUtf8(16) } : null;

    if (reader.hasTrailingNonZeroBits()) {
      return { ok: false, reason: "invalid-schema" };
    }

    const enPassant =
      enPassantFile === NO_EN_PASSANT_FILE
        ? "-"
        : `${FILES[enPassantFile]}${sideToMove === "b" ? "3" : "6"}`;
    const fen = [
      placementFromMasks(masks),
      sideToMove,
      castling,
      enPassant,
      String(halfmoveClock),
      String(fullmoveNumber),
    ].join(" ");

    if (
      publishedBy.length === 0 ||
      !Number.isSafeInteger(createdAtMs) ||
      !loadChess(fen) ||
      !hasOneKingPerSide(masks) ||
      Boolean(lastMove?.uci) !== Boolean(lastMove?.san)
    ) {
      return { ok: false, reason: "invalid-schema" };
    }

    return {
      ok: true,
      state: {
        version: 1,
        fen: new Chess(fen).fen(),
        publishedBy,
        lastMove,
        createdAt: new Date(createdAtMs).toISOString(),
      },
    };
  } catch {
    return { ok: false, reason: "invalid-binary" };
  }
}

type PieceMasks = {
  occupancy: bigint;
  white: bigint;
  p: bigint;
  n: bigint;
  b: bigint;
  r: bigint;
  q: bigint;
};

function sanitizeNickname(input: string): string {
  return Array.from(input)
    .filter((character) => /^[A-Za-z0-9 _-]$/u.test(character))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

function placementFromMasks(masks: PieceMasks): string {
  const ranks: string[] = [];
  for (let rank = 7; rank >= 0; rank -= 1) {
    let empty = 0;
    let row = "";

    for (let file = 0; file < 8; file += 1) {
      const bit = 1n << BigInt(file + rank * 8);
      const piece = pieceAt(masks, bit);

      if (!piece) {
        empty += 1;
        continue;
      }

      if (empty > 0) {
        row += String(empty);
        empty = 0;
      }
      row += piece;
    }

    ranks.push(row + (empty > 0 ? String(empty) : ""));
  }

  return ranks.join("/");
}

function pieceAt(masks: PieceMasks, bit: bigint): string | null {
  if ((masks.occupancy & bit) === 0n) {
    return null;
  }

  const isWhite = (masks.white & bit) !== 0n;
  let piece = "k";

  for (const code of PIECE_CODES) {
    if ((masks[code] & bit) !== 0n) {
      piece = code;
      break;
    }
  }

  return isWhite ? piece.toUpperCase() : piece;
}

function hasOneKingPerSide(masks: PieceMasks): boolean {
  const typedPieces = PIECE_CODES.reduce((accumulator, code) => accumulator | masks[code], 0n);
  const kings = masks.occupancy & ~typedPieces;
  return popcount(kings & masks.white) === 1 && popcount(kings & ~masks.white) === 1;
}

function maskToCastling(mask: number): string {
  const castling = `${mask & 1 ? "K" : ""}${mask & 2 ? "Q" : ""}${mask & 4 ? "k" : ""}${
    mask & 8 ? "q" : ""
  }`;
  return castling || "-";
}

function depositBits(compact: bigint, domain: bigint): bigint {
  let out = 0n;
  let compactIndex = 0n;

  for (let square = 0n; square < 64n; square += 1n) {
    const bit = 1n << square;
    if ((domain & bit) !== 0n) {
      if ((compact & (1n << compactIndex)) !== 0n) {
        out |= bit;
      }
      compactIndex += 1n;
    }
  }

  return out;
}

function popcount(value: bigint): number {
  let count = 0;
  let current = value;
  while (current) {
    current &= current - 1n;
    count += 1;
  }
  return count;
}

class BitReader {
  private bitOffset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readNumber(bitCount: number): number {
    return Number(this.readBigInt(bitCount));
  }

  readBigInt(bitCount: number): bigint {
    let value = 0n;

    for (let index = 0; index < bitCount; index += 1) {
      if (this.bitOffset >= this.bytes.length * 8) {
        throw new Error("Unexpected end of bitstream.");
      }

      const byte = this.bytes[Math.floor(this.bitOffset / 8)];
      const bit = (byte >> (this.bitOffset % 8)) & 1;
      if (bit) {
        value |= 1n << BigInt(index);
      }
      this.bitOffset += 1;
    }

    return value;
  }

  readVarUint(): number {
    this.alignToByte();
    let value = 0;
    let multiplier = 1;

    for (let index = 0; index < 8; index += 1) {
      const byte = this.readNumber(8);
      value += (byte & 0x7f) * multiplier;
      if ((byte & 0x80) === 0) {
        return value;
      }
      multiplier *= 128;
    }

    throw new Error("Varuint is too large.");
  }

  readUtf8(maxLength: number): string {
    const length = this.readVarUint();
    if (length > maxLength) {
      throw new Error("String is too long.");
    }

    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      bytes[index] = this.readNumber(8);
    }

    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  alignToByte(): void {
    if (this.bitOffset % 8 !== 0) {
      this.bitOffset += 8 - (this.bitOffset % 8);
    }
  }

  hasTrailingNonZeroBits(): boolean {
    while (this.bitOffset < this.bytes.length * 8) {
      if (this.readNumber(1) !== 0) {
        return true;
      }
    }
    return false;
  }
}

function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error("Invalid Base64URL input.");
  }

  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
