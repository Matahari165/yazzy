import { isRoomCode, normalizeRoomCode } from "../domain/roomCode";

export const PERMANENT_ROOM_STORAGE_KEY = "yazzy.permanentRoomCode.v1";
export const DEFAULT_PERMANENT_ROOM_CODE = "YAZZY2";

export function readPermanentRoomCode(): string {
  if (typeof window === "undefined") return DEFAULT_PERMANENT_ROOM_CODE;
  try {
    const raw = window.localStorage.getItem(PERMANENT_ROOM_STORAGE_KEY);
    if (!raw) return DEFAULT_PERMANENT_ROOM_CODE;
    const normalized = normalizeRoomCode(raw);
    if (isRoomCode(normalized)) return normalized;
    window.localStorage.removeItem(PERMANENT_ROOM_STORAGE_KEY);
    return DEFAULT_PERMANENT_ROOM_CODE;
  } catch {
    return DEFAULT_PERMANENT_ROOM_CODE;
  }
}

export function writePermanentRoomCode(code: string): string {
  const normalized = normalizeRoomCode(code);
  if (!isRoomCode(normalized)) return readPermanentRoomCode();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PERMANENT_ROOM_STORAGE_KEY, normalized);
    } catch {}
  }
  return normalized;
}
