import { decodePublishedStateBinary, encodePublishedStateBinary } from "./binaryStateCodec";
import type { PublishedStateV1 } from "./publishedState";

export const MAX_ENCODED_PAYLOAD_LENGTH = 512;

export type DecodeFailureReason =
  | "oversized"
  | "invalid-binary"
  | "unsupported-version"
  | "invalid-schema";

export type DecodeResult =
  | { ok: true; state: PublishedStateV1 }
  | { ok: false; reason: DecodeFailureReason };

export function encodePublishedState(state: PublishedStateV1): string {
  return encodePublishedStateBinary(state);
}

export function decodePublishedState(encoded: string): DecodeResult {
  if (encoded.length > MAX_ENCODED_PAYLOAD_LENGTH) {
    return { ok: false, reason: "oversized" };
  }

  return decodePublishedStateBinary(encoded);
}
