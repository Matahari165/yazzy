export const PLAYER_NAME_STORAGE_KEY = "yazzy.playerName.v1";
export const PLAYER_NAME_MAX_LENGTH = 16;

export function normalizePlayerName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, PLAYER_NAME_MAX_LENGTH);
}

export function isPlayerName(value: unknown): value is string {
  return typeof value === "string" && value === normalizePlayerName(value) && value.length >= 1;
}
