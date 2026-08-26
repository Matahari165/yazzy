import type { CategoryId, Dice, DiceCounts } from "../yatzy";

export const BOT_LEVELS = ["strategist", "expert"] as const;
export type BotLevel = (typeof BOT_LEVELS)[number];

export type BotDecisionContext = {
  dice: Dice;
  rollNumber: number;
  remainingRolls: number;
  scores: Partial<Record<CategoryId, number>>;
  opponentScore: number;
};

export type BotPolicy = {
  level: BotLevel;
  label: string;
  description: string;
  precision: "heuristic" | "exact";
  pickCategory: (context: BotDecisionContext) => CategoryId;
  pickHold: (context: BotDecisionContext, category: CategoryId) => DiceCounts;
};
