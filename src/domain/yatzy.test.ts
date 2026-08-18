import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_IDS, bestCombinationLabel, scoreDice, totalScore, type DieValue } from "./yatzy";

describe("Yatzy nordique — scores", () => {
  it("joue avec 14 cases, sans Chance", () => {
    expect(CATEGORY_IDS).toHaveLength(14);
    expect(CATEGORY_IDS.map(String)).not.toContain("chance");
  });

  it("calcule la section supérieure", () => {
    expect(scoreDice("fours", [4, 4, 4, 2, 6])).toBe(12);
  });

  it("prend la paire la plus élevée", () => {
    expect(scoreDice("pair", [2, 2, 5, 5, 5])).toBe(10);
  });

  it("interdit de compter un carré comme deux paires", () => {
    expect(scoreDice("twoPairs", [4, 4, 4, 4, 6])).toBe(0);
  });

  it("calcule deux paires différentes", () => {
    expect(scoreDice("twoPairs", [2, 2, 5, 5, 6])).toBe(14);
  });

  it("reconnaît les deux suites nordiques", () => {
    expect(scoreDice("smallStraight", [5, 3, 1, 4, 2])).toBe(15);
    expect(scoreDice("largeStraight", [2, 3, 4, 5, 6])).toBe(20);
  });

  it("exige deux valeurs différentes pour le full", () => {
    expect(scoreDice("fullHouse", [2, 2, 5, 5, 5])).toBe(19);
    expect(scoreDice("fullHouse", [5, 5, 5, 5, 5])).toBe(0);
  });

  it("additionne les cases sans bonus supérieur", () => {
    const scores = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 };
    expect(totalScore({ ...scores, ones: 2 })).toBe(62);
    expect(totalScore(scores)).toBe(63);
    expect(totalScore({ ...scores, pair: 1 })).toBe(64);
  });

  it("décrit la meilleure combinaison visible", () => {
    expect(bestCombinationLabel([6, 6, 6, 6, 6])).toBe("Yatzy ! Cinq dés identiques");
    expect(bestCombinationLabel([2, 2, 5, 5, 5])).toBe("Full ! Une paire et un brelan");
    expect(bestCombinationLabel([1, 2, 3, 4, 6])).toBeNull();
  });

  it("fournit des explications et un score maximal exacts pour chaque case", () => {
    for (const category of CATEGORIES) {
      expect(category.rule.length).toBeGreaterThan(0);
      expect(category.scoring.length).toBeGreaterThan(0);

      let observedMaximum = 0;
      for (let first = 1; first <= 6; first += 1) {
        for (let second = 1; second <= 6; second += 1) {
          for (let third = 1; third <= 6; third += 1) {
            for (let fourth = 1; fourth <= 6; fourth += 1) {
              for (let fifth = 1; fifth <= 6; fifth += 1) {
                observedMaximum = Math.max(
                  observedMaximum,
                  scoreDice(category.id, [first, second, third, fourth, fifth] as DieValue[]),
                );
              }
            }
          }
        }
      }

      expect(category.maximumScore).toBe(observedMaximum);
    }
  });
});
