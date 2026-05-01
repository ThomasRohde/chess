import { sanitizeNickname, validateNickname } from "../domain/nickname/nickname";

export const NICKNAME_STORAGE_KEY = "branchChess.nickname";

let memoryNickname: string | null = null;

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readNickname(): string | null {
  const storage = getStorage();

  if (!storage) {
    return memoryNickname;
  }

  try {
    const stored = storage.getItem(NICKNAME_STORAGE_KEY);
    if (!stored) {
      return memoryNickname;
    }

    const validation = validateNickname(stored);
    return validation.ok ? validation.value : memoryNickname;
  } catch {
    return memoryNickname;
  }
}

export function writeNickname(input: string): string {
  const validation = validateNickname(input);

  if (!validation.ok) {
    throw new Error("Nickname is required.");
  }

  memoryNickname = validation.value;
  const storage = getStorage();

  if (storage) {
    try {
      storage.setItem(NICKNAME_STORAGE_KEY, validation.value);
    } catch {
      // In private or locked-down browsers, keep the session usable in memory.
    }
  }

  return validation.value;
}

export function clearNickname(): void {
  memoryNickname = null;
  const storage = getStorage();

  if (storage) {
    try {
      storage.removeItem(NICKNAME_STORAGE_KEY);
    } catch {
      // Clearing local storage is best-effort only.
    }
  }
}

export function previewNickname(input: string): string {
  return sanitizeNickname(input);
}
