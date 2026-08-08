import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "../yatzy";
import { getBotPolicy } from ".";
import type { BotLevel } from ".";

const context = {
  dice: [6, 6, 2, 3, 4] as const,
  rollNumber: 1,
  remainingRolls: 0,
  scores: {},
  opponentScore: 18,
};

describe("politiques de bot", () => {
  it.each<[BotLevel]>([["discovery"], ["calculator"], ["strategist"]])(
    "%s choisit une case libre et une conservation légale",
    (level) => {
      const policy = getBotPolicy(level);
      const category = policy.pickCategory(context);
      const hold = policy.pickHold(context, category);

      expect(CATEGORY_IDS).toContain(category);
      expect(hold).toHaveLength(6);
      expect(hold.every((count) => Number.isInteger(count) && count >= 0)).toBe(true);
      expect(hold.reduce((sum, count) => sum + count, 0)).toBeLessThanOrEqual(5);
    },
  );

  it("documente le stratège comme une heuristique et le calculateur comme exact", () => {
    expect(getBotPolicy("strategist").precision).toBe("heuristic");
    expect(getBotPolicy("strategist").description).toContain("pas une stratégie optimale");
    expect(getBotPolicy("calculator").precision).toBe("exact");
  });
});
