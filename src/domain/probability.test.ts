import { describe, expect, it } from "vitest";
import { evaluateCategory, rollOutcomes } from "./probability";
import { countsToDice } from "./yatzy";

describe("moteur de probabilités exactes", () => {
  it("produit une distribution totale égale à 1", () => {
    for (let dice = 0; dice <= 5; dice += 1) {
      const total = rollOutcomes(dice).reduce((sum, outcome) => sum + outcome.probability, 0);
      expect(total).toBeCloseTo(1, 12);
    }
  });

  it("trouve une chance sur six de finir un Yatzy avec quatre dés identiques", () => {
    const result = evaluateCategory("yatzy", [6, 6, 6, 6, 2], 1);
    expect(result.successProbability).toBeCloseTo(1 / 6, 12);
    expect(result.expectedScore).toBeCloseTo(50 / 6, 12);
  });

  it("retrouve l'exemple de petite suite du plan", () => {
    const result = evaluateCategory("smallStraight", [2, 3, 4, 6, 6], 2);
    expect(result.successProbability).toBeCloseTo(53 / 324, 12);
  });

  it("ne promet aucune réussite après le dernier lancer", () => {
    const result = evaluateCategory("largeStraight", [1, 1, 2, 3, 4], 0);
    expect(result.successProbability).toBe(0);
    expect(result.expectedScore).toBe(0);
  });

  it("garde les dés 5 et 6 pour maximiser Chance avec deux relances", () => {
    const result = evaluateCategory("chance", [2, 3, 4, 5, 6], 2);
    expect(countsToDice(result.bestHoldForExpectedScore)).toEqual([5, 6]);
  });
});
