"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  REACTION_EMOJIS,
  type ReactionEmoji,
  type RoomReaction,
} from "@/domain/multiplayerRoomProtocol";
import type { MultiplayerRole } from "@/domain/multiplayer";
import { ReactionToast } from "./ReactionToast";

const REACTION_LABELS: Record<ReactionEmoji, string> = {
  "😆": "Très drôle",
  "😂": "Ça me fait rire",
  "🤭": "Oups",
  "🤑": "Jackpot",
  "😏": "Bien tenté",
  "🤪": "N’importe quoi",
  "😨": "Ça fait peur",
  "🤯": "Incroyable",
  "😭": "Quelle tristesse",
  "🤬": "Quelle rage",
  "💀": "Je suis mort",
};

type MultiplayerReactionsProps = {
  disabled: boolean;
  latestReaction: RoomReaction | null;
  localRole: MultiplayerRole;
  localName: string;
  opponentName: string;
  onSend: (emoji: ReactionEmoji) => void;
};

export function MultiplayerReactions({
  disabled,
  latestReaction,
  localRole,
  localName,
  opponentName,
  onSend,
}: MultiplayerReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleReaction, setVisibleReaction] = useState<RoomReaction | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lastReactionIdRef = useRef<string | null>(null);
  const optimisticEmojiRef = useRef<ReactionEmoji | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const showReaction = useCallback((reaction: RoomReaction) => {
    setVisibleReaction(reaction);
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setVisibleReaction(null), 2_400);
  }, []);

  useEffect(() => {
    if (!latestReaction || latestReaction.id === lastReactionIdRef.current) return;
    lastReactionIdRef.current = latestReaction.id;
    if (latestReaction.role === localRole && latestReaction.emoji === optimisticEmojiRef.current) {
      optimisticEmojiRef.current = null;
      return;
    }
    showReaction(latestReaction);
  }, [latestReaction, localRole, showReaction]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => () => {
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
  }, []);

  const reactionAuthor = visibleReaction?.role === localRole ? localName : opponentName;

  return (
    <div className="reaction-control" ref={wrapperRef}>
      <button
        ref={triggerRef}
        className="reaction-trigger"
        type="button"
        aria-label="Envoyer une réaction"
        aria-expanded={isOpen}
        aria-controls="reaction-picker"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true">☺</span>
      </button>
      {isOpen ? (
        <div id="reaction-picker" className="reaction-picker" role="group" aria-label="Réactions rapides">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={REACTION_LABELS[emoji]}
              onClick={() => {
                const optimisticReaction: RoomReaction = {
                  id: `local-${Date.now()}`,
                  role: localRole,
                  emoji,
                  sentAt: Date.now(),
                };
                lastReactionIdRef.current = optimisticReaction.id;
                optimisticEmojiRef.current = emoji;
                showReaction(optimisticReaction);
                onSend(emoji);
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      ) : null}
      {visibleReaction ? (
        <ReactionToast key={visibleReaction.id} author={reactionAuthor} emoji={visibleReaction.emoji} />
      ) : null}
    </div>
  );
}
