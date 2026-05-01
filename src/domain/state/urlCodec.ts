import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { z } from "zod";

import { isValidFen } from "../chess/chessService";
import { sanitizeNickname } from "../nickname/nickname";
import type { PublishedStateV1 } from "./publishedState";
import type { UrlPayloadV1 } from "./urlPayload";

export const MAX_ENCODED_PAYLOAD_LENGTH = 4096;
export const MAX_DECODED_PAYLOAD_LENGTH = 2048;

export type DecodeFailureReason =
  | "oversized"
  | "invalid-compression"
  | "invalid-json"
  | "unsupported-version"
  | "invalid-schema";

export type DecodeResult =
  | { ok: true; state: PublishedStateV1 }
  | { ok: false; reason: DecodeFailureReason };

const isoDateSchema = z.string().refine((value) => {
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
});

const urlPayloadV1Schema = z
  .object({
    v: z.literal(1),
    f: z.string().min(1).max(128).refine(isValidFen),
    by: z
      .string()
      .transform((value) => sanitizeNickname(value))
      .refine((value) => value.length > 0 && value.length <= 24),
    u: z.string().min(4).max(8).optional(),
    san: z.string().min(1).max(16).optional(),
    at: isoDateSchema,
  })
  .refine((payload) => Boolean(payload.u) === Boolean(payload.san));

export function encodePublishedState(state: PublishedStateV1): string {
  const payload = publishedStateToUrlPayload(state);
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodePublishedState(encoded: string): DecodeResult {
  if (encoded.length > MAX_ENCODED_PAYLOAD_LENGTH) {
    return { ok: false, reason: "oversized" };
  }

  const decoded = decompressFromEncodedURIComponent(encoded);

  if (!decoded) {
    return { ok: false, reason: "invalid-compression" };
  }

  if (decoded.length > MAX_DECODED_PAYLOAD_LENGTH) {
    return { ok: false, reason: "oversized" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(decoded);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  if (!isObjectWithVersion(parsed)) {
    return { ok: false, reason: "invalid-schema" };
  }

  if (parsed.v !== 1) {
    return { ok: false, reason: "unsupported-version" };
  }

  const validation = urlPayloadV1Schema.safeParse(parsed);

  if (!validation.success) {
    return { ok: false, reason: "invalid-schema" };
  }

  return { ok: true, state: urlPayloadToPublishedState(validation.data) };
}

export function publishedStateToUrlPayload(state: PublishedStateV1): UrlPayloadV1 {
  return {
    v: 1,
    f: state.fen,
    by: state.publishedBy,
    ...(state.lastMove
      ? {
          u: state.lastMove.uci,
          san: state.lastMove.san,
        }
      : {}),
    at: state.createdAt,
  };
}

export function urlPayloadToPublishedState(payload: UrlPayloadV1): PublishedStateV1 {
  return {
    version: 1,
    fen: payload.f,
    publishedBy: payload.by,
    lastMove:
      payload.u && payload.san
        ? {
            uci: payload.u,
            san: payload.san,
          }
        : null,
    createdAt: payload.at,
  };
}

function isObjectWithVersion(value: unknown): value is { v: unknown } {
  return typeof value === "object" && value !== null && "v" in value;
}
