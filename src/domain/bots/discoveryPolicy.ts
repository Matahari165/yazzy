import { CATEGORY_IDS, countDice, scoreDice, type CategoryId, type DiceCounts } from "../yatzy";
import { chooseFirstOpenCategory, simpleHold } from "./utils";
import type { BotDecisionContext, BotPolicy } from "./types";

function pickCategory(context: BotDecisionContext): CategoryId {
  const open = CATEGORY_IDS.filter((category) => context.scores[category] === undefined);
  if (!open.length) return "chance";

  if (context.dice.length === 5) {
    const immediate = open.reduce<{ category: CategoryId; score: number } | null>((best, category) => {
      const score = scoreDice(category, context.dice);
      return !best || score > best.score ? { category, score } : best;
    }, null);
    if (immediate && immediate.score > 0) return immediate.category;
  }

  return open.includes("chance") ? "chance" : chooseFirstOpenCategory(context.scores);
}

function pickHold(context: BotDecisionContext, category: CategoryId): DiceCounts {
  if (context.dice.length !== 5) return [0, 0, 0, 0, 0, 0];
  if (category === "chance") return countDice(context.dice);
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
