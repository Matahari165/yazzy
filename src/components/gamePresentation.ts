import { CATEGORY_BY_ID, type CategoryId } from "../domain/yatzy";

const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export type CoachFeedback = {
  message: string;
  tone: "success" | "tip";
};

export function holdFeedback(category: CategoryId, gap: number, bestHold: string): CoachFeedback {
  const label = CATEGORY_BY_ID[category].label;
  return gap < 0.1
    ? { message: `Bon choix pour viser ${label} : ta conservation est optimale ou équivalente.`, tone: "success" }
    : { message: `Pour viser ${label}, garder ${bestHold} valait environ ${decimal.format(gap)} point attendu de plus.`, tone: "tip" };
}

export function scoreFeedback(
  category: CategoryId,
  points: number,
  bestCategory: CategoryId,
  gap: number,
): CoachFeedback {
  if (gap < 0.1) {
    return { message: `${CATEGORY_BY_ID[category].label} était un excellent choix pour ce tour.`, tone: "success" };
  }

  if (bestCategory === category) {
    return {
      message: `Tu inscris ${points} point${points > 1 ? "s" : ""} maintenant. Relancer avant d'inscrire ${CATEGORY_BY_ID[category].label} valait environ ${decimal.format(gap)} point attendu de plus.`,
      tone: "tip",
    };
  }

  return {
    message: `Tu inscris ${points} point${points > 1 ? "s" : ""}. En valeur immédiate, viser ${CATEGORY_BY_ID[bestCategory].label} valait environ ${decimal.format(gap)} point attendu de plus.`,
    tone: "tip",
  };
}

export function gameTitle(rollNumber: number, selectedCategory: CategoryId | null): string {
  if (rollNumber === 0) return "À toi de lancer.";
  if (rollNumber === 3) return "Choisis ta case.";
  return selectedCategory ? `Construis ${CATEGORY_BY_ID[selectedCategory].label}.` : "Construis ton coup.";
}
