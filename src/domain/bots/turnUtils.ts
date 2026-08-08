import { totalScore, type DiceCounts } from "../yatzy";
import type { GameState } from "../game";
import type { BotDecisionContext } from "./types";

export function contextForBot(game: GameState): BotDecisionContext {
  return {
    dice: game.bot.dice,
    rollNumber: game.bot.rollNumber,
    remainingRolls: Math.max(0, 3 - game.bot.rollNumber),
    scores: game.bot.scores,
    opponentScore: totalScore(game.human.scores),
  };
}

export function holdFlagsForDice(dice: BotDecisionContext["dice"], hold: DiceCounts): boolean[] {
  const remaining = [...hold];
  return dice.map((die) => {
    const index = die - 1;
    if ((remaining[index] ?? 0) < 1) return false;
    remaining[index] -= 1;
    return true;
  });
}
