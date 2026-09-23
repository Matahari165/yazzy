import { GAME_STORAGE_KEY, isFinished, isStoredGame, type GameState } from "../domain/game";
import { recordSoloResult } from "./soloStats";

export function removeStoredGame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(GAME_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function readStoredGame(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GAME_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredGame(parsed)) return null;
    if (isFinished(parsed)) {
      if (recordSoloResult(parsed)) removeStoredGame();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredGame(game: GameState): boolean {
  if (typeof window === "undefined") return false;
  if (isFinished(game)) return recordSoloResult(game) && removeStoredGame();
  try {
    window.localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(game));
    return true;
  } catch {
    return false;
  }
}
