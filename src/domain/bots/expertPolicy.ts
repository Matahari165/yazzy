import { evaluateCategory, type CategoryEvaluation } from "../probability";
import { CATEGORY_BY_ID, CATEGORY_IDS, type CategoryId, type DiceCounts } from "../yatzy";
import { chooseFirstOpenCategory, evaluateOpenCategories } from "./utils";
import type { BotDecisionContext, BotPolicy } from "./types";

const baselineCache = new Map<string, number>();

function baselineExpectedScore(category: CategoryId, remainingRolls: number): number {
  const key = `${category}:${remainingRolls}`;
  const cached = baselineCache.get(key);
  if (cached !== undefined) return cached;

  const baseline = evaluateCategory(category, [], remainingRolls).expectedScore;
  baselineCache.set(key, baseline);
  return baseline;
}

/**
 * Compare le rendement de ce tour à la valeur normale de la case.
 * Une case facile peut donc être prise quand elle est exceptionnellement
 * bonne, tandis qu'une case rare est conservée si le tirage est médiocre.
 */
function expertValue(context: BotDecisionContext, evaluation: CategoryEvaluation): number {
  const definition = CATEGORY_BY_ID[evaluation.category];
  const baseline = baselineExpectedScore(evaluation.category, context.remainingRolls);
  const openCount = CATEGORY_IDS.filter((category) => context.scores[category] === undefined).length;
  let value = evaluation.expectedScore + (evaluation.expectedScore - baseline);

  if (evaluation.currentScore > 0) value += Math.min(3, evaluation.currentScore / 10);

  if (definition.fixedScore) {
    if (evaluation.currentScore === definition.fixedScore) {
      value += 4 + evaluation.successProbability * 4;
    } else if (openCount > 4) {
      value -= (1 - evaluation.successProbability) * 3;
    } else {
      value -= 2;
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
  description: "Calcule les meilleurs dés et compare chaque choix à la valeur future des cases restantes.",
  precision: "heuristic",
  pickCategory,
  pickHold,
};
