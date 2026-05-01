import { Chess } from "chess.js";

import { isValidFen } from "../chess/chessService";
import { sanitizeNickname } from "../nickname/nickname";
import type { PublishedStateV1 } from "./publishedState";

const BINARY_PAYLOAD_VERSION = 2;
const NO_EN_PASSANT_FILE = 8;
const FILES = "abcdefgh";
const PIECE_CODES = ["p", "n", "b", "r", "q"] as const;

type PieceMasks = {
  occupancy: bigint;
  white: bigint;
  p: bigint;
  n: bigint;
  b: bigint;
  r: bigint;
  q: bigint;
};

export type BinaryDecodeResult =
  | { ok: true; state: PublishedStateV1 }
  | { ok: false; reason: "invalid-binary" | "unsupported-version" | "invalid-schema" };

export function encodePublishedStateBinary(state: PublishedStateV1): string {
  const canonicalFen = new Chess(state.fen).fen();
  const fields = splitFen(canonicalFen);
  const masks = masksFromPlacement(fields.placement);
  const writer = new BitWriter();

  writer.writeNumber(BINARY_PAYLOAD_VERSION, 3);
  writer.writeNumber(fields.sideToMove === "b" ? 1 : 0, 1);
  writer.writeNumber(castlingToMask(fields.castling), 4);
  writer.writeNumber(enPassantToFile(fields.enPassant), 4);
  writer.writeBigInt(masks.occupancy, 64);

  let remaining = masks.occupancy;
  writer.writeBigInt(extractBits(masks.white, remaining), popcount(remaining));

  for (const code of PIECE_CODES) {
    writer.writeBigInt(extractBits(masks[code], remaining), popcount(remaining));
    remaining &= ~masks[code];
  }

  writer.alignToByte();
  writer.writeVarUint(Number(fields.halfmoveClock));
  writer.writeVarUint(Number(fields.fullmoveNumber) - 1);
  writer.writeVarUint(Date.parse(state.createdAt));
  writer.writeUtf8(sanitizeNickname(state.publishedBy));
  writer.writeNumber(state.lastMove ? 1 : 0, 1);
  writer.alignToByte();

  if (state.lastMove) {
    writer.writeUtf8(state.lastMove.uci);
    writer.writeUtf8(state.lastMove.san);
  }

  return base64UrlEncode(writer.toBytes());
}

export function decodePublishedStateBinary(encoded: string): BinaryDecodeResult {
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
    const masks: PieceMasks = {
      occupancy,
      white,
      p: 0n,
      n: 0n,
      b: 0n,
      r: 0n,
      q: 0n,
    };

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

    const lastMove = hasLastMove
      ? {
          uci: reader.readUtf8(8),
          san: reader.readUtf8(16),
        }
      : null;

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
      !isValidFen(fen) ||
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

function splitFen(fen: string) {
  const [placement, sideToMove, castling, enPassant, halfmoveClock, fullmoveNumber] =
    fen.split(" ");

  return {
    placement,
    sideToMove,
    castling,
    enPassant,
    halfmoveClock: Number(halfmoveClock),
    fullmoveNumber: Number(fullmoveNumber),
  };
}

function masksFromPlacement(placement: string): PieceMasks {
  const masks: PieceMasks = {
    occupancy: 0n,
    white: 0n,
    p: 0n,
    n: 0n,
    b: 0n,
    r: 0n,
    q: 0n,
  };
  const ranks = placement.split("/");

  for (let fenRank = 0; fenRank < 8; fenRank += 1) {
    let file = 0;
    for (const char of ranks[fenRank]) {
      if (/\d/.test(char)) {
        file += Number(char);
        continue;
      }

      const rank = 7 - fenRank;
      const square = file + rank * 8;
      const bit = 1n << BigInt(square);
      const lower = char.toLowerCase() as keyof PieceMasks;
      masks.occupancy |= bit;

      if (char === char.toUpperCase()) {
        masks.white |= bit;
      }

      if (lower in masks && lower !== "occupancy" && lower !== "white") {
        masks[lower] |= bit;
      }

      file += 1;
    }
  }

  return masks;
}

function placementFromMasks(masks: PieceMasks): string {
  const ranks: string[] = [];

  for (let rank = 7; rank >= 0; rank -= 1) {
    let empty = 0;
    let row = "";

    for (let file = 0; file < 8; file += 1) {
      const square = file + rank * 8;
      const bit = 1n << BigInt(square);
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

    if (empty > 0) {
      row += String(empty);
    }

    ranks.push(row);
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
  const whiteKings = kings & masks.white;
  const blackKings = kings & ~masks.white;

  return popcount(whiteKings) === 1 && popcount(blackKings) === 1;
}

function castlingToMask(castling: string): number {
  if (castling === "-") {
    return 0;
  }

  return (
    (castling.includes("K") ? 1 : 0) |
    (castling.includes("Q") ? 2 : 0) |
    (castling.includes("k") ? 4 : 0) |
    (castling.includes("q") ? 8 : 0)
  );
}

function maskToCastling(mask: number): string {
  const castling = `${mask & 1 ? "K" : ""}${mask & 2 ? "Q" : ""}${mask & 4 ? "k" : ""}${
    mask & 8 ? "q" : ""
  }`;

  return castling || "-";
}

function enPassantToFile(enPassant: string): number {
  if (enPassant === "-") {
    return NO_EN_PASSANT_FILE;
  }

  return FILES.indexOf(enPassant[0]);
}

function extractBits(mask: bigint, domain: bigint): bigint {
  let out = 0n;
  let compactIndex = 0n;

  for (let square = 0n; square < 64n; square += 1n) {
    const bit = 1n << square;

    if ((domain & bit) !== 0n) {
      if ((mask & bit) !== 0n) {
        out |= 1n << compactIndex;
      }
      compactIndex += 1n;
    }
  }

  return out;
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

class BitWriter {
  private bytes: number[] = [];
  private bitOffset = 0;

  writeNumber(value: number, bitCount: number): void {
    this.writeBigInt(BigInt(value), bitCount);
  }

  writeBigInt(value: bigint, bitCount: number): void {
    for (let index = 0; index < bitCount; index += 1) {
      if (this.bitOffset % 8 === 0) {
        this.bytes.push(0);
      }

      if ((value & (1n << BigInt(index))) !== 0n) {
        this.bytes[this.bytes.length - 1] |= 1 << this.bitOffset % 8;
      }

      this.bitOffset += 1;
    }
  }

  writeVarUint(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error("Invalid varuint.");
    }

    this.alignToByte();
    let current = value;

    do {
      let byte = current % 128;
      current = Math.floor(current / 128);
      if (current > 0) {
        byte |= 0x80;
      }
      this.bytes.push(byte);
      this.bitOffset += 8;
    } while (current > 0);
  }

  writeUtf8(value: string): void {
    const bytes = new TextEncoder().encode(value);
    this.writeVarUint(bytes.length);
    for (const byte of bytes) {
      this.bytes.push(byte);
      this.bitOffset += 8;
    }
  }

  alignToByte(): void {
    if (this.bitOffset % 8 !== 0) {
      this.bitOffset += 8 - (this.bitOffset % 8);
    }
  }

  toBytes(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
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
      const bit = (byte >> this.bitOffset % 8) & 1;
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

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error("Invalid Base64URL input.");
  }

  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
