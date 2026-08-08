import { GAME_STORAGE_KEY, isStoredGame, type GameState } from "@/domain/game";

export function readStoredGame(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GAME_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredGame(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredGame(game: GameState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(game));
    return true;
  } catch {
    return false;
  }
}
