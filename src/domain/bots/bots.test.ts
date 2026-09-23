import { describe, expect, it } from "vitest";
import { CATEGORY_IDS, type CategoryId, type DieValue } from "../yatzy";
import { getBotPolicy } from ".";
import { completeBotTurn } from "./turn";
import { createGame, isFinished, rollPlayerTurn, scoreHumanTurn } from "../game";

const context = {
  dice: [6, 6, 2, 3, 4] as const,
  rollNumber: 1,
  remainingRolls: 0,
  scores: {},
  opponentScores: {},
  ownScore: 0,
  opponentScore: 18,
};

describe("politiques de bot", () => {
  it("l'expert choisit une case libre et une conservation légale", () => {
      const policy = getBotPolicy("expert");
      const category = policy.pickCategory(context);
      const hold = policy.pickHold(context, category);

      expect(CATEGORY_IDS).toContain(category);
      expect(hold).toHaveLength(6);
      expect(hold.every((count) => Number.isInteger(count) && count >= 0)).toBe(true);
      expect(hold.reduce((sum, count) => sum + count, 0)).toBeLessThanOrEqual(5);
  });

  it("documente l'expert", () => {
    expect(getBotPolicy("expert").description).toContain("cases ensemble");
    expect(getBotPolicy("expert").reassessAfterRoll).toBe(true);
  });

  it("l'expert sacrifie la case au plus faible coût futur quand aucun point n'est disponible", () => {
    const scores = Object.fromEntries([
      "ones", "twos", "threes", "fours", "pair", "twoPairs", "threeOfAKind", "fourOfAKind", "smallStraight", "fullHouse",
    ].map((category) => [category, 0])) as Partial<Record<CategoryId, number>>;
    const finalRoll = {
      dice: [1, 1, 1, 1, 2] as const,
      rollNumber: 3,
      remainingRolls: 0,
      scores,
      opponentScores: {},
      ownScore: 100,
      opponentScore: 100,
    };

    expect(getBotPolicy("expert").pickCategory(finalRoll)).toBe("yatzy");
  });

  it("change sa conservation selon l'avance à la fin", () => {
    const scores = Object.fromEntries(CATEGORY_IDS.filter((category) =>
      category !== "twoPairs" && category !== "yatzy",
    ).map((category) => [category, 0])) as Partial<Record<CategoryId, number>>;
    const position = {
      dice: [2, 2, 5, 5, 6] as const,
      rollNumber: 2,
      remainingRolls: 1,
      scores,
      opponentScores: scores,
      ownScore: 100,
    };
    const policy = getBotPolicy("expert");
    const ahead = policy.pickHold({ ...position, opponentScore: 95 }, "twoPairs");
    const behind = policy.pickHold({ ...position, opponentScore: 105 }, "twoPairs");
    expect(ahead).not.toEqual(behind);
  });

  it("poursuit un Yatzy avec quatre dés identiques et une relance", () => {
    const scores = Object.fromEntries(CATEGORY_IDS.filter((category) =>
      category !== "yatzy",
    ).map((category) => [category, 0])) as Partial<Record<CategoryId, number>>;
    const position = {
      dice: [6, 6, 6, 6, 2] as const,
      rollNumber: 2,
      remainingRolls: 1,
      scores,
      opponentScores: scores,
      ownScore: 80,
      opponentScore: 82,
    };
    expect(getBotPolicy("expert").pickHold(position, "yatzy")).toEqual([0, 0, 0, 0, 0, 4]);
  });

  it("termine une partie complète avec des lancers déterministes", () => {
    let seed = 17;
    const roll = (): DieValue => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return ((seed % 6) + 1) as DieValue;
    };
    let game = createGame("expert", "bot");
    for (const category of CATEGORY_IDS) {
      game = completeBotTurn(game, roll);
      expect(game.activePlayer).toBe("human");
      game = scoreHumanTurn({ ...game, human: rollPlayerTurn(game.human, roll) }, category);
    }
    expect(isFinished(game)).toBe(true);
    expect(Object.keys(game.bot.scores)).toHaveLength(CATEGORY_IDS.length);
  });
});
