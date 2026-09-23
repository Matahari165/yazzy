import type { CategoryId, Dice, DiceCounts } from "../yatzy";

export type BotLevel = "expert";

export type BotDecisionContext = {
  dice: Dice;
  rollNumber: number;
  remainingRolls: number;
  scores: Partial<Record<CategoryId, number>>;
  opponentScores: Partial<Record<CategoryId, number>>;
  ownScore: number;
  opponentScore: number;
};

export type BotPolicy = {
  level: BotLevel;
  label: string;
  description: string;
  precision: "heuristic" | "exact";
  reassessAfterRoll: boolean;
  pickCategory: (context: BotDecisionContext) => CategoryId;
  pickHold: (context: BotDecisionContext, category: CategoryId) => DiceCounts;
};
