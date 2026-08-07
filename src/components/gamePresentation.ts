import { formatHoldAction, type CategoryEvaluation } from "../domain/probability";
import { CATEGORIES, CATEGORY_BY_ID, type CategoryId } from "../domain/yatzy";

const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export type CoachFeedback = {
  message: string;
  tone: "success" | "tip";
};

export function holdFeedback(category: CategoryId, gap: number, bestHold: string): CoachFeedback {
  const label = CATEGORY_BY_ID[category].label;
  const betterAction = bestHold === "aucun dé" ? "tout relancer" : `garder ${bestHold}`;
  return gap < 0.1
    ? { message: `Bon choix pour viser ${label} : ta conservation est optimale ou équivalente.`, tone: "success" }
    : { message: `Pour viser ${label}, ${betterAction} valait environ ${decimal.format(gap)} point${gap > 1 ? "s" : ""} attendu${gap > 1 ? "s" : ""} de plus.`, tone: "tip" };
}

export function scoreFeedback(
  category: CategoryId,
  points: number,
  bestCategory: CategoryId,
  gap: number,
  remainingRolls: number,
): CoachFeedback {
  if (gap < 0.1) {
    return { message: `${CATEGORY_BY_ID[category].label} était un excellent choix pour ce tour.`, tone: "success" };
  }

  if (bestCategory === category) {
    return {
      message: `Tu inscris ${points} point${points > 1 ? "s" : ""} maintenant. Relancer avant d'inscrire ${CATEGORY_BY_ID[category].label} valait environ ${decimal.format(gap)} point${gap > 1 ? "s" : ""} attendu${gap > 1 ? "s" : ""} de plus.`,
      tone: "tip",
    };
  }

  return {
    message: remainingRolls > 0
      ? `Tu inscris ${points} point${points > 1 ? "s" : ""}. En continuant le tour vers ${CATEGORY_BY_ID[bestCategory].label}, le score moyen attendu était supérieur d’environ ${decimal.format(gap)} point${gap > 1 ? "s" : ""}.`
      : `Tu inscris ${points} point${points > 1 ? "s" : ""}. ${CATEGORY_BY_ID[bestCategory].label} rapportait environ ${decimal.format(gap)} point${gap > 1 ? "s" : ""} de plus immédiatement.`,
    tone: "tip",
  };
}

export function gameTitle(rollNumber: number, selectedCategory: CategoryId | null): string {
  if (rollNumber === 0) return "À toi de lancer.";
  if (rollNumber === 3) return "Choisis ta case.";
  return selectedCategory ? `Construis ${CATEGORY_BY_ID[selectedCategory].label}.` : "Construis ton coup.";
}

export function recommendationMessage(
  evaluation: CategoryEvaluation | undefined,
  remainingRolls: number,
): string | null {
  if (!evaluation) return null;
  const label = CATEGORY_BY_ID[evaluation.category].shortLabel;
  return remainingRolls > 0
    ? `Maintenant : ${label} · ${formatHoldAction(evaluation.bestHoldForExpectedScore)}`
    : `Meilleure case : ${label} · ${evaluation.currentScore} pts`;
}

export function bestRecordedScore(scores: Partial<Record<CategoryId, number>>) {
  return CATEGORIES.reduce<{ label: string; score: number } | null>((best, category) => {
    const recorded = scores[category.id];
    if (recorded === undefined || (best && recorded <= best.score)) return best;
    return { label: category.label, score: recorded };
  }, null);
}
