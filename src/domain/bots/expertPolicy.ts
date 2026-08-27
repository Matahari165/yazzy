import { evaluateCategory, type CategoryEvaluation } from "../probability";
import { CATEGORY_BY_ID, CATEGORY_IDS, type CategoryId, type DiceCounts } from "../yatzy";
import { chooseFirstOpenCategory, evaluateOpenCategories } from "./utils";
import type { BotDecisionContext, BotPolicy } from "./types";

const baselineCache = new Map<CategoryId, number>();

function freshTurnExpectedScore(category: CategoryId): number {
  const cached = baselineCache.get(category);
  if (cached !== undefined) return cached;

  const baseline = evaluateCategory(category, [], 3).expectedScore;
  baselineCache.set(category, baseline);
  return baseline;
}

/**
 * Estime la valeur globale de la décision : les points attendus maintenant,
 * moins ce que la case aurait normalement rapporté lors d'un futur tour frais.
 * Puis adapte le risque à l'écart de score, surtout en fin de partie.
 */
function expertValue(context: BotDecisionContext, evaluation: CategoryEvaluation): number {
  const definition = CATEGORY_BY_ID[evaluation.category];
  const baseline = freshTurnExpectedScore(evaluation.category);
  const openCount = CATEGORY_IDS.filter((category) => context.scores[category] === undefined).length;
  const scoreGap = context.opponentScore - context.ownScore;
  const endgameWeight = 1 + (CATEGORY_IDS.length - openCount) / CATEGORY_IDS.length;
  const pressure = Math.max(-1, Math.min(1, scoreGap / Math.max(12, openCount * 6))) * endgameWeight;
  const opportunityAdjustedValue = evaluation.expectedScore - baseline;
  let value = evaluation.expectedScore + opportunityAdjustedValue;

  if (pressure > 0) {
    const upside = Math.max(0, definition.maximumScore - evaluation.expectedScore);
    value += pressure * Math.min(6, upside / 7);
  } else if (pressure < 0) {
    const security = evaluation.currentScore > 0 ? evaluation.currentScore : evaluation.expectedScore * evaluation.successProbability;
    value += -pressure * Math.min(5, security / 6);
  }

  if (definition.fixedScore) {
    if (evaluation.currentScore === definition.fixedScore) {
      value += 4 + evaluation.successProbability * 4 + Math.max(0, -pressure) * 2;
    } else if (openCount > 4) {
      value -= (1 - evaluation.successProbability) * (3 + Math.max(0, -pressure));
    } else {
      value -= Math.max(0, 2 - Math.max(0, pressure) * 2);
    }
  }

  return value;
}

function pickCategory(context: BotDecisionContext): CategoryId {
  const open = CATEGORY_IDS.filter((category) => context.scores[category] === undefined);
  if (!open.length || context.dice.length !== 5) return chooseFirstOpenCategory(context.scores);

  const evaluations = evaluateOpenCategories(context);
  return evaluations.reduce((best, candidate) =>
    expertValue(context, candidate) > expertValue(context, best) + 1e-9 ? candidate : best,
  evaluations[0]).category;
}

function pickHold(context: BotDecisionContext, category: CategoryId): DiceCounts {
  return context.dice.length === 5
    ? evaluateCategory(category, context.dice, context.remainingRolls).bestHoldForExpectedScore
    : [0, 0, 0, 0, 0, 0];
}

export const expertPolicy: BotPolicy = {
  level: "expert",
  label: "Expert",
  description: "Réévalue ses choix après chaque lancer, protège la valeur future des cases et adapte le risque au score.",
  precision: "heuristic",
  reassessAfterRoll: true,
  pickCategory,
  pickHold,
};
