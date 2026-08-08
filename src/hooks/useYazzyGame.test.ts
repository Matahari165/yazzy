import { describe, expect, it } from "vitest";
import { createGame, rollPlayerTurn, scoreHumanTurn } from "../domain/game";

describe("état du jeu", () => {
  it("conserve les dés gardés après une relance", () => {
    const current = {
      dice: [6, 2, 3, 4, 5] as [6, 2, 3, 4, 5],
      held: [true, false, false, false, false],
      rollNumber: 1,
      scores: {},
    };
    let index = 0;
    const next = rollPlayerTurn(current, () => ([1, 1, 1, 1][index++] ?? 1) as 1);

    expect(next.dice).toEqual([6, 1, 1, 1, 1]);
    expect(next.held).toEqual([true, false, false, false, false]);
    expect(next.rollNumber).toBe(2);
  });

  it("refuse une relance quand les cinq dés sont gardés", () => {
    const current = {
      dice: [6, 2, 3, 4, 5] as [6, 2, 3, 4, 5],
      held: [true, true, true, true, true],
      rollNumber: 1,
      scores: {},
    };
    expect(rollPlayerTurn(current)).toBe(current);
  });

  it("enchaîne inscription humaine et passage au bot", () => {
    const game = {
      ...createGame("bot", "strategist"),
      human: {
        dice: [6, 5, 4, 3, 2] as [6, 5, 4, 3, 2],
        held: [false, false, false, false, false],
        rollNumber: 1,
        scores: {},
      },
    };
    const next = scoreHumanTurn(game, "largeStraight");

    expect(next.activePlayer).toBe("bot");
    expect(next.human.scores.largeStraight).toBe(20);
    expect(next.botTurn.status).toBe("rolling");
  });
});
