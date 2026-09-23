import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, GAME_STORAGE_KEY, type GameState } from "../domain/game";
import { CATEGORY_IDS, type CategoryId } from "../domain/yatzy";
import { readStoredGame, writeStoredGame } from "./gameStorage";
import { readSoloResults } from "./soloStats";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

function finishedGame(): GameState {
  const game = createGame("expert", "human");
  const scores = Object.fromEntries(CATEGORY_IDS.map((category) => [category, 0])) as Record<CategoryId, number>;
  return {
    ...game,
    turn: CATEGORY_IDS.length + 1,
    human: { ...game.human, scores },
    bot: { ...game.bot, scores },
  };
}

describe("stockage de la partie bot", () => {
  let localStorage: Storage;

  beforeEach(() => {
    localStorage = createMemoryStorage();
    vi.stubGlobal("window", { localStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("conserve une partie en cours", () => {
    const game = createGame("expert", "human");

    expect(writeStoredGame(game)).toBe(true);
    expect(readStoredGame()).toEqual(game);
  });

  it("supprime la sauvegarde dès que la partie est terminée", () => {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(createGame("expert", "human")));
    const finished = finishedGame();
    expect(writeStoredGame(finished)).toBe(true);
    expect(writeStoredGame(finished)).toBe(true);
    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBeNull();
    expect(readSoloResults()).toHaveLength(1);
  });

  it("nettoie une ancienne sauvegarde terminée à la lecture", () => {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(finishedGame()));

    expect(readStoredGame()).toBeNull();
    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBeNull();
    expect(readSoloResults()).toHaveLength(1);
  });
});
