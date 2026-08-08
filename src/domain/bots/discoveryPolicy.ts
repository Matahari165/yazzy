import { CATEGORY_IDS, scoreDice, type CategoryId, type DiceCounts } from "../yatzy";
import { chooseFirstOpenCategory, simpleHold } from "./utils";
import type { BotDecisionContext, BotPolicy } from "./types";

function pickCategory(context: BotDecisionContext): CategoryId {
  const open = CATEGORY_IDS.filter((category) => context.scores[category] === undefined);
  if (!open.length) return CATEGORY_IDS[0];

  if (context.dice.length === 5) {
    const immediate = open.reduce<{ category: CategoryId; score: number } | null>((best, category) => {
      const score = scoreDice(category, context.dice);
      return !best || score > best.score ? { category, score } : best;
    }, null);
    if (immediate && immediate.score > 0) return immediate.category;
  }

  return chooseFirstOpenCategory(context.scores);
}

function pickHold(context: BotDecisionContext, category: CategoryId): DiceCounts {
  if (context.dice.length !== 5) return [0, 0, 0, 0, 0, 0];
  return simpleHold(context.dice);
}

export const discoveryPolicy: BotPolicy = {
  level: "discovery",
  label: "Découverte",
  description: "Des décisions simples : il garde les doublons et commet quelques erreurs raisonnables.",
  precision: "heuristic",
  pickCategory,
  pickHold,
};
