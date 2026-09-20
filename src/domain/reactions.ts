export const REACTION_EMOJIS = [
  "😆",
  "😂",
  "🤭",
  "🤑",
  "😏",
  "🤪",
  "😨",
  "🤯",
  "😭",
  "🤬",
  "💀",
  "😈",
  "👑",
  "🔥",
  "🥳",
  "😎",
  "👏",
  "😮",
  "🫡",
  "😱",
  "😅",
] as const;

export const BOT_REACTION_EMOJIS = REACTION_EMOJIS;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
export type BotReactionEmoji = (typeof BOT_REACTION_EMOJIS)[number];

/** Phrase d'interaction envoyée avec un emoji fun depuis le menu des réactions. */
export const STRIP_PHRASE = "Who's gonna have to strip";
export const STRIP_EMOJI: ReactionEmoji = "🔥";
export const REACTION_TEXT_MAX_LENGTH = 48;

export function isReactionText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= REACTION_TEXT_MAX_LENGTH &&
    !/[\u0000-\u001F\u007F]/.test(value)
  );
}
