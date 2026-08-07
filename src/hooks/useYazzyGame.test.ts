import { describe, expect, it } from "vitest";
import { isStoredGame, rollGame, type GameState } from "./useYazzyGame";

const gameWithOneRoll = (): GameState => ({
  dice: [6, 2, 3, 4, 5],
  held: [true, false, false, false, false],
  rollNumber: 1,
  turn: 1,
  scores: {},
});

describe("état de partie", () => {
  it("conserve les dés verrouillés après une relance", () => {
    const values = [1, 1, 1, 1] as const;
    let index = 0;
    const next = rollGame(gameWithOneRoll(), () => values[index++]);

    expect(next.dice).toEqual([6, 1, 1, 1, 1]);
    expect(next.held).toEqual([true, false, false, false, false]);
    expect(next.rollNumber).toBe(2);
  });

  it("ne consomme pas un lancer quand les cinq dés sont gardés", () => {
    const current = { ...gameWithOneRoll(), held: [true, true, true, true, true] };
    expect(rollGame(current)).toBe(current);
  });

  it("rejette une sauvegarde incohérente", () => {
    expect(isStoredGame({ ...gameWithOneRoll(), dice: [7, 2, 3, 4, 5] })).toBe(false);
    expect(isStoredGame({ ...gameWithOneRoll(), rollNumber: 4 })).toBe(false);
    expect(isStoredGame({ ...gameWithOneRoll(), scores: { unknown: 12 } })).toBe(false);
    expect(isStoredGame({ ...gameWithOneRoll(), scores: [] })).toBe(false);
    expect(isStoredGame({ ...gameWithOneRoll(), turn: 4 })).toBe(false);
  });
});
