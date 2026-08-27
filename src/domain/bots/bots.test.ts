import { describe, expect, it } from "vitest";
import { CATEGORY_IDS, type CategoryId } from "../yatzy";
import { getBotPolicy } from ".";

const context = {
  dice: [6, 6, 2, 3, 4] as const,
  rollNumber: 1,
  remainingRolls: 0,
  scores: {},
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
    expect(getBotPolicy("expert").description).toContain("valeur future");
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
      ownScore: 100,
      opponentScore: 100,
    };

    expect(getBotPolicy("expert").pickCategory(finalRoll)).toBe("yatzy");
  });

  it("l'expert adapte le risque à l'écart de score en fin de partie", () => {
    const scores = Object.fromEntries([
      "ones", "twos", "threes", "fours", "pair", "twoPairs", "threeOfAKind", "fourOfAKind", "smallStraight", "fullHouse",
    ].map((category) => [category, 0])) as Partial<Record<CategoryId, number>>;
    const position = {
      dice: [1, 1, 1, 1, 6] as const,
      rollNumber: 3,
      remainingRolls: 0,
      scores,
    };

    expect(getBotPolicy("expert").pickCategory({ ...position, ownScore: 130, opponentScore: 70 })).toBe("sixes");
    expect(getBotPolicy("expert").pickCategory({ ...position, ownScore: 70, opponentScore: 130 })).toBe("yatzy");
  });
});
