import { rollFairDie } from "../../lib/random";
import { CATEGORY_BY_ID, totalScore, type CategoryId } from "../yatzy";
import { getBotPolicy } from ".";
import { contextForBot } from "./turnUtils";
import { holdFlagsForDice } from "./utils";
import { rollPlayerTurn, scoreBotTurn, type GameState } from "../game";
import type { DieValue } from "../yatzy";

export function prepareBotStep(current: GameState): GameState {
  if (current.activePlayer !== "bot" || current.botTurn.status !== "waiting") return current;
  if (current.bot.rollNumber >= 3) {
    return { ...current, botTurn: { ...current.botTurn, status: "choosing" } };
  }

  const context = contextForBot(current);
  if (!current.botLevel) return current;
  const policy = getBotPolicy(current.botLevel);
  const targetCategory = current.botTurn.targetCategory ?? policy.pickCategory(context);
  const hold = policy.pickHold(context, targetCategory);
  const held = holdFlagsForDice(current.bot.dice, hold);
  return {
    ...current,
    bot: { ...current.bot, held },
    botTurn: { ...current.botTurn, status: held.every(Boolean) ? "choosing" : "rolling", targetCategory },
  };
}

export function completeBotTurn(current: GameState, rollDie: () => DieValue = rollFairDie): GameState {
  if (current.activePlayer !== "bot") return current;

  if (!current.botLevel) return current;
  const policy = getBotPolicy(current.botLevel);
  let bot = current.bot;
  let targetCategory: CategoryId | null = current.botTurn.targetCategory;

  if (bot.rollNumber > 0 && bot.rollNumber < 3 && !targetCategory) {
    const context = contextForBot({ ...current, bot });
    targetCategory = policy.pickCategory(context);
    bot = { ...bot, held: holdFlagsForDice(bot.dice, policy.pickHold(context, targetCategory)) };
  }

  while (bot.rollNumber < 3 && !(bot.rollNumber > 0 && bot.held.every(Boolean))) {
    bot = rollPlayerTurn(bot, rollDie);
    const context = contextForBot({ ...current, bot });
    targetCategory ??= policy.pickCategory(context);
    const held = holdFlagsForDice(bot.dice, policy.pickHold(context, targetCategory));
    bot = { ...bot, held };
  }

  const context = contextForBot({ ...current, bot });
  targetCategory ??= policy.pickCategory(context);
  const finished = scoreBotTurn({ ...current, bot, botTurn: { ...current.botTurn, targetCategory } }, targetCategory);
  if (finished.activePlayer !== "human") return finished;
  const points = finished.bot.scores[targetCategory] ?? 0;
  return {
    ...finished,
    botTurn: {
      ...finished.botTurn,
      message: `Bot : ${CATEGORY_BY_ID[targetCategory].label} · ${points} point${points > 1 ? "s" : ""} · total ${totalScore(finished.bot.scores)}.`,
    },
  };
}
