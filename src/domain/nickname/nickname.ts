export const NICKNAME_MAX_LENGTH = 24;

export type NicknameValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" };

export function sanitizeNickname(input: string): string {
  const allowedCharacters = Array.from(input).filter((character) =>
    /^[A-Za-z0-9 _-]$/.test(character),
  );

  return allowedCharacters
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NICKNAME_MAX_LENGTH);
}

export function validateNickname(input: string): NicknameValidationResult {
  const value = sanitizeNickname(input);

  if (!value) {
    return { ok: false, reason: "empty" };
  }

  return { ok: true, value };
}
