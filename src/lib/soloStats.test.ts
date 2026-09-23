import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "../domain/game";
import { CATEGORY_IDS, type CategoryId } from "../domain/yatzy";
import { exportSoloResults, getDeviceId, importSoloResults, readSoloResults, recordSoloResult, summarizeSoloResults } from "./soloStats";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

function finished() {
  const game = createGame("expert", "human");
  const scores = Object.fromEntries(CATEGORY_IDS.map((category) => [category, 0])) as Record<CategoryId, number>;
  return { ...game, human: { ...game.human, scores: { ...scores, yatzy: 50 } }, bot: { ...game.bot, scores } };
}

describe("historique solo", () => {
  beforeEach(() => vi.stubGlobal("window", { localStorage: memoryStorage() }));
  afterEach(() => vi.unstubAllGlobals());

  it("enregistre une partie terminée une seule fois et calcule son issue", () => {
    const game = finished();
    expect(recordSoloResult(game)).toBe(true);
    expect(recordSoloResult(game)).toBe(true);
    expect(readSoloResults()).toHaveLength(1);
    expect(summarizeSoloResults(readSoloResults())).toMatchObject({ games: 1, wins: 1, losses: 0 });
    expect(readSoloResults()[0]).toMatchObject({ id: game.gameId, outcome: "win", humanScore: 50, botScore: 0 });
  });

  it("fusionne un export d'un autre appareil sans doublon", () => {
    recordSoloResult(finished());
    const exported = exportSoloResults();
    window.localStorage.clear();
    getDeviceId();
    expect(importSoloResults(exported)).toBe(1);
    expect(importSoloResults(exported)).toBe(0);
    expect(readSoloResults()).toHaveLength(1);
  });

  it("compte séparément victoires, défaites et égalités", () => {
    const win = finished();
    const loss = finished();
    const tie = finished();
    recordSoloResult(win);
    recordSoloResult({ ...loss, human: { ...loss.human, scores: loss.bot.scores }, bot: { ...loss.bot, scores: loss.human.scores } });
    recordSoloResult({ ...tie, bot: { ...tie.bot, scores: tie.human.scores } });
    expect(summarizeSoloResults(readSoloResults())).toEqual({ games: 3, wins: 1, losses: 1, ties: 1 });
  });

  it("rejette un import invalide sans toucher à l'historique", () => {
    recordSoloResult(finished());
    const before = exportSoloResults();
    expect(() => importSoloResults('{"version":1,"results":[{"id":"fake"}]}')).toThrow();
    expect(exportSoloResults()).toBe(before);
  });
});
