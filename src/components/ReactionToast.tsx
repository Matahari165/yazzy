import type { BotReactionEmoji } from "@/domain/reactions";

type ReactionMood =
  | "joy"
  | "shy"
  | "cash"
  | "smug"
  | "royal"
  | "blaze"
  | "shock"
  | "sad"
  | "rage"
  | "dead"
  | "salute"
  | "party"
  | "relief";

type ReactionFx =
  | "laugh"
  | "wobble"
  | "party"
  | "clap"
  | "relief"
  | "peek"
  | "coins"
  | "smug"
  | "royal"
  | "fire"
  | "mindblown"
  | "mischief"
  | "gasp"
  | "shock"
  | "tremble"
  | "sob"
  | "rage"
  | "haunt"
  | "salute";

const REACTION_MOODS: Record<BotReactionEmoji, ReactionMood> = {
  "😆": "joy",
  "😂": "joy",
  "🤪": "joy",
  "🥳": "party",
  "👏": "joy",
  "😅": "relief",
  "🤭": "shy",
  "🤑": "cash",
  "😏": "smug",
  "😎": "smug",
  "👑": "royal",
  "🔥": "blaze",
  "🤯": "blaze",
  "😈": "blaze",
  "😮": "shock",
  "😱": "shock",
  "😨": "shock",
  "😭": "sad",
  "🤬": "rage",
  "💀": "dead",
  "🫡": "salute",
};

const REACTION_FX: Record<BotReactionEmoji, ReactionFx> = {
  "😆": "laugh",
  "😂": "laugh",
  "🤪": "wobble",
  "🥳": "party",
  "👏": "clap",
  "😅": "relief",
  "🤭": "peek",
  "🤑": "coins",
  "😏": "smug",
  "😎": "smug",
  "👑": "royal",
  "🔥": "fire",
  "🤯": "mindblown",
  "😈": "mischief",
  "😮": "gasp",
  "😱": "shock",
  "😨": "tremble",
  "😭": "sob",
  "🤬": "rage",
  "💀": "haunt",
  "🫡": "salute",
};

type ReactionToastProps = {
  author: string;
  emoji: BotReactionEmoji;
};

export function ReactionToast({ author, emoji }: ReactionToastProps) {
  return (
    <div
      className="reaction-toast"
      data-mood={REACTION_MOODS[emoji] ?? "joy"}
      data-fx={REACTION_FX[emoji] ?? "laugh"}
      role="status"
      aria-live="polite"
      aria-label={`${author} ${emoji}`}
    >
      <span className="reaction-face" aria-hidden="true">
        <b>{emoji}</b>
        <i />
        <i />
        <i />
      </span>
      <span className="reaction-who" aria-hidden="true">
        <small>{author}</small>
      </span>
    </div>
  );
}
