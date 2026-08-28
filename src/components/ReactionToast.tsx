import type { BotReactionEmoji } from "@/domain/reactions";

type ReactionToastProps = {
  author: string;
  emoji: BotReactionEmoji;
};

export function ReactionToast({ author, emoji }: ReactionToastProps) {
  return (
    <div
      className="reaction-toast"
      role="status"
      aria-live="polite"
      aria-label={`${author} ${emoji}`}
    >
      <small aria-hidden="true">{author}</small>
      <span className="reaction-burst" aria-hidden="true">
        <i />
        <b>{emoji}</b>
        <i />
      </span>
    </div>
  );
}
