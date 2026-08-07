import { describe, expect, it } from "vitest";
import { evaluateCategory } from "../domain/probability";
import { bestRecordedScore, holdFeedback, recommendationMessage, scoreFeedback } from "./gamePresentation";

describe("scoreFeedback", () => {
  it("confirms an optimal score choice", () => {
    expect(scoreFeedback("chance", 24, "chance", 0.05, 0)).toEqual({
      message: "Chance était un excellent choix pour ce tour.",
      tone: "success",
    });
  });

  it("explains when another roll was better for the same category", () => {
    const feedback = scoreFeedback("chance", 20, "chance", 1.5, 1);

    expect(feedback.tone).toBe("tip");
    expect(feedback.message).toContain("Relancer avant d'inscrire Chance");
    expect(feedback.message).not.toContain("viser Chance");
  });

  it("names a better category when the score choice was suboptimal", () => {
    const feedback = scoreFeedback("ones", 1, "sixes", 4.2, 1);

    expect(feedback.tone).toBe("tip");
    expect(feedback.message).toContain("continuant le tour vers Six");
  });

  it("décrit une meilleure case immédiate après le dernier lancer", () => {
    const feedback = scoreFeedback("ones", 1, "sixes", 5, 0);
    expect(feedback.message).toContain("5 points de plus immédiatement");
  });
});

describe("présentation du conseil", () => {
  it("dit de tout relancer sans formulation mécanique", () => {
    expect(holdFeedback("chance", 2, "aucun dé").message).toContain("tout relancer");
  });

  it("distingue une relance du choix final", () => {
    const evaluation = evaluateCategory("yatzy", [6, 6, 6, 6, 2], 1);
    expect(recommendationMessage(evaluation, 1)).toContain("Garde 6–6–6–6");
    expect(recommendationMessage(evaluation, 0)).toBe("Meilleure case : Yatzy · 0 pts");
  });

  it("identifie la meilleure case déjà inscrite", () => {
    expect(bestRecordedScore({ ones: 3, chance: 21, yatzy: 0 })).toEqual({
      label: "Chance",
      score: 21,
    });
  });
});
