import { describe, expect, it } from "vitest";
import { evaluateCategory, generalProbability, rollOutcomes } from "./probability";
import { CATEGORY_IDS, countsToDice, scoreDice } from "./yatzy";

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

  it("calcule une probabilité générale stable pour chaque catégorie", () => {
    for (const category of CATEGORY_IDS) {
      const probability = generalProbability(category);
      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(1);
      expect(generalProbability(category)).toBe(probability);
    }
  });

  it("respecte les invariants de toutes les cases et de tous les jets", () => {
    for (const category of CATEGORY_IDS) {
      for (const outcome of rollOutcomes(5)) {
        const dice = countsToDice(outcome.counts);
        const final = evaluateCategory(category, dice, 0);
        const withOneRoll = evaluateCategory(category, dice, 1);
        const currentScore = scoreDice(category, dice);

        expect(final.expectedScore).toBe(currentScore);
        expect(final.successProbability).toBe(currentScore > 0 ? 1 : 0);
        expect(withOneRoll.expectedScore).toBeGreaterThanOrEqual(currentScore);
        expect(withOneRoll.successProbability).toBeGreaterThanOrEqual(0);
        expect(withOneRoll.successProbability).toBeLessThanOrEqual(1);
      }
    }
  });
});
