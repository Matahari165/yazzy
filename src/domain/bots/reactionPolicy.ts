import type { BotReactionEmoji } from "../reactions";
import { CATEGORY_BY_ID, type CategoryId } from "../yatzy";

export type BotReactionEvent = {
  actor: "human" | "bot";
  category: CategoryId;
  points: number;
  scoredCount: number;
  isEndgame?: boolean;
};

export type BotReactionHistory = {
  sentCount: number;
  lastScoreCount: number | null;
  lastEmoji: BotReactionEmoji | null;
  lastSentAt: number | null;
};

export const INITIAL_BOT_REACTION_HISTORY: BotReactionHistory = {
  sentCount: 0,
  lastScoreCount: null,
  lastEmoji: null,
  lastSentAt: null,
};

const COMBO_CATEGORIES: CategoryId[] = ["twoPairs", "fourOfAKind", "fullHouse"];
const STRAIGHT_CATEGORIES: CategoryId[] = ["smallStraight", "largeStraight"];
const BOT_POOLS: Record<"human" | "bot", readonly BotReactionEmoji[]> = {
  bot: ["😈", "🤑", "😏", "😂", "🤪", "👑", "🔥", "💀", "🥳", "😎"],
  human: ["👏", "🔥", "🤯", "😮", "🫡", "😂", "😱", "👑", "💀", "😅"],
};
const HUMAN_MOCKERY_POOL: readonly BotReactionEmoji[] = ["😂", "😏", "🤪", "💀", "😈"];
const BOT_FAILURE_POOL: readonly BotReactionEmoji[] = ["😭", "💀", "😅", "🤬"];
const HIGH_STAKES_CATEGORIES: CategoryId[] = ["fourOfAKind", "smallStraight", "largeStraight", "fullHouse", "yatzy"];

function pickEmoji(pool: readonly BotReactionEmoji[], previous: BotReactionEmoji | null, rng: () => number) {
  const available = pool.filter((emoji) => emoji !== previous);
  return available[Math.min(available.length - 1, Math.floor(rng() * available.length))];
}

export function chooseBotReaction(
  event: BotReactionEvent,
  history: BotReactionHistory,
  rng: () => number = Math.random,
  now = Date.now(),
): BotReactionEmoji | null {
  if (history.sentCount >= 6) return null;
  if (history.lastSentAt !== null && now - history.lastSentAt < 3_500) return null;

  const isYatzy = event.category === "yatzy" && event.points === 50;
  if (
    !isYatzy &&
    history.lastScoreCount !== null &&
    event.scoredCount - history.lastScoreCount < 3
  ) return null;

  const definition = CATEGORY_BY_ID[event.category];
  const scoreRatio = event.points / definition.maximumScore;
  const isBadHumanMove = event.actor === "human" && (
    event.points === 0 || (!definition.fixedScore && scoreRatio <= 0.3)
  );
  const isBigBotMiss = event.actor === "bot"
    && event.points === 0
    && HIGH_STAKES_CATEGORIES.includes(event.category);
  if (event.points <= 0 && !isBadHumanMove && !isBigBotMiss) return null;

  if (isBadHumanMove) {
    if (rng() >= 0.8) return null;
    return pickEmoji(HUMAN_MOCKERY_POOL, history.lastEmoji, rng);
  }

  if (isBigBotMiss) {
    if (rng() >= (event.isEndgame ? 0.45 : 0.25)) return null;
    return pickEmoji(BOT_FAILURE_POOL, history.lastEmoji, rng);
  }

  const isBigCombo = STRAIGHT_CATEGORIES.includes(event.category)
    || COMBO_CATEGORIES.includes(event.category);
  const probability = event.actor === "human"
    ? isYatzy
      ? 1
      : isBigCombo
        ? 0.82
        : scoreRatio >= 1
          ? 0.72
          : scoreRatio >= 0.8
            ? 0.56
            : 0
    : isYatzy
      ? 1
      : event.isEndgame && (isBigCombo || scoreRatio >= 0.8)
        ? 0.55
        : isBigCombo
          ? 0.35
          : scoreRatio >= 0.9 && definition.maximumScore >= 20
            ? 0.25
            : 0;

  if (rng() >= probability) return null;
  return pickEmoji(BOT_POOLS[event.actor], history.lastEmoji, rng);
}

export function recordBotReaction(
  history: BotReactionHistory,
  scoredCount: number,
  emoji: BotReactionEmoji,
  sentAt = Date.now(),
): BotReactionHistory {
  return {
    sentCount: history.sentCount + 1,
    lastScoreCount: scoredCount,
    lastEmoji: emoji,
    lastSentAt: sentAt,
  };
}
