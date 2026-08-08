import { evaluateCategory, type CategoryEvaluation } from "../probability";
import { CATEGORY_BY_ID, CATEGORY_IDS, upperSubtotal, type CategoryId, type DiceCounts } from "../yatzy";
import { chooseFirstOpenCategory, evaluateOpenCategories } from "./utils";
import type { BotDecisionContext, BotPolicy } from "./types";

/*
 * Heuristique de partie, volontairement non optimale :
 * - la valeur immédiate reste la base ;
 * - une case supérieure proche du bonus reçoit un poids supplémentaire ;
 * - quand peu de cases restent, les cases fixes déjà réussies sont légèrement favorisées.
 * Une recherche exhaustive de toute la partie serait nécessaire pour parler d'optimalité.
 */
function strategicValue(context: BotDecisionContext, evaluation: CategoryEvaluation): number {
  const currentUpper = upperSubtotal(context.scores);
  const definition = CATEGORY_BY_ID[evaluation.category];
  let value = evaluation.expectedScore;

  if (definition.section === "upper" && currentUpper < 63) {
    const projectedUpper = currentUpper + evaluation.expectedScore;
    if (projectedUpper >= 63) value += 12;
    else if (currentUpper >= 48) value += Math.min(6, evaluation.expectedScore * 0.18);
  }

  if (CATEGORY_IDS.filter((candidate) => context.scores[candidate] === undefined).length <= 3 && definition.fixedScore) {
    value += evaluation.currentScore > 0 ? 1.5 : -1;
  }

  return value;
}

function pickCategory(context: BotDecisionContext): CategoryId {
  const open = CATEGORY_IDS.filter((category) => context.scores[category] === undefined);
  if (!open.length || context.dice.length !== 5) return chooseFirstOpenCategory(context.scores);
  const evaluations = evaluateOpenCategories(context);

  return evaluations.reduce((best, candidate) =>
    strategicValue(context, candidate) > strategicValue(context, best) + 1e-9 ? candidate : best,
  evaluations[0]).category;
}

function pickHold(context: BotDecisionContext, category: CategoryId): DiceCounts {
  return context.dice.length === 5
    ? evaluateCategory(category, context.dice, context.remainingRolls).bestHoldForExpectedScore
    : [0, 0, 0, 0, 0, 0];
}

export const strategistPolicy: BotPolicy = {
  level: "strategist",
  label: "Stratège",
  description: "Prend en compte les cases restantes et la proximité du bonus supérieur pour une stratégie plus globale.",
  precision: "heuristic",
  pickCategory,
  pickHold,
};
