import { totalScore } from "../yatzy";
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
