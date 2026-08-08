import { evaluateCategory } from "../probability";
import { CATEGORY_IDS, type CategoryId, type DiceCounts } from "../yatzy";
import { chooseFirstOpenCategory, evaluateOpenCategories } from "./utils";
import type { BotDecisionContext, BotPolicy } from "./types";

function pickCategory(context: BotDecisionContext): CategoryId {
  const open = CATEGORY_IDS.filter((category) => context.scores[category] === undefined);
  if (!open.length || context.dice.length !== 5) return chooseFirstOpenCategory(context.scores);

  const evaluations = evaluateOpenCategories(context);
  return evaluations.reduce((best, candidate) => {
    if (candidate.expectedScore > best.expectedScore + 1e-9) return candidate;
    if (Math.abs(candidate.expectedScore - best.expectedScore) <= 1e-9 && candidate.currentScore > best.currentScore) return candidate;
    return best;
  }, evaluations[0]).category;
}

function pickHold(context: BotDecisionContext, category: CategoryId): DiceCounts {
  return context.dice.length === 5
    ? evaluateCategory(category, context.dice, context.remainingRolls).bestHoldForExpectedScore
    : [0, 0, 0, 0, 0, 0];
}

export const calculatorPolicy: BotPolicy = {
  level: "calculator",
  label: "Calculateur",
  description: "Maximise le score attendu du tour avec le moteur exact des issues possibles.",
  precision: "exact",
  pickCategory,
  pickHold,
};
