import { describe, expect, it } from "vitest";
import { evaluateCategory } from "../domain/probability";
import { bestRecordedScore, recommendationMessage, scoreFeedback } from "./gamePresentation";

describe("scoreFeedback", () => {
  it("confirms an optimal score choice", () => {
    expect(scoreFeedback("chance", 24, "chance", 0.05)).toEqual({
      message: "Chance était un excellent choix pour ce tour.",
      tone: "success",
    });
  });

  it("explains when another roll was better for the same category", () => {
    const feedback = scoreFeedback("chance", 20, "chance", 1.5);

    expect(feedback.tone).toBe("tip");
    expect(feedback.message).toContain("Relancer avant d'inscrire Chance");
    expect(feedback.message).not.toContain("viser Chance");
  });

  it("names a better category when the score choice was suboptimal", () => {
    const feedback = scoreFeedback("ones", 1, "sixes", 4.2);

    expect(feedback.tone).toBe("tip");
    expect(feedback.message).toContain("viser Six");
  });
});

describe("présentation du conseil", () => {
  it("distingue une relance du choix final", () => {
    const evaluation = evaluateCategory("yatzy", [6, 6, 6, 6, 2], 1);
    expect(recommendationMessage(evaluation, 1)).toContain("garde 6–6–6–6");
    expect(recommendationMessage(evaluation, 0)).toBe("Meilleure case : Yatzy · 0 pts");
  });

  it("identifie la meilleure case déjà inscrite", () => {
    expect(bestRecordedScore({ ones: 3, chance: 21, yatzy: 0 })).toEqual({
      label: "Chance",
      score: 21,
    });
  });
});
