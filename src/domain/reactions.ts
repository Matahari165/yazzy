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
