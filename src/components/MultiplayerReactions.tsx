"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  REACTION_EMOJIS,
  type ReactionEmoji,
  type RoomReaction,
} from "@/domain/multiplayerRoomProtocol";
import { STRIP_EMOJI, STRIP_PHRASE } from "@/domain/reactions";
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
  "😈": "Malicieux",
  "👑": "Royal",
  "🔥": "En feu",
  "🥳": "Fête",
  "😎": "Trop cool",
  "👏": "Bravo",
  "😮": "Oh !",
  "🫡": "Bien reçu",
  "😱": "Quelle peur",
  "😅": "Ouf",
};

const FAVORITE_EMOJIS: readonly ReactionEmoji[] = ["😂", "😱", "👏", "🤭", "🔥"];
const OTHER_EMOJIS = REACTION_EMOJIS.filter((emoji) => !FAVORITE_EMOJIS.includes(emoji));

type MultiplayerReactionsProps = {
  disabled: boolean;
  momentKey?: string | null;
  latestReaction: RoomReaction | null;
  localRole: MultiplayerRole;
  localName: string;
  opponentName: string;
  onSend: (emoji: ReactionEmoji, text?: string) => void;
};

export function MultiplayerReactions({
  disabled,
  momentKey,
  latestReaction,
  localRole,
  localName,
  opponentName,
  onSend,
}: MultiplayerReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [visibleReaction, setVisibleReaction] = useState<RoomReaction | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lastReactionIdRef = useRef<string | null>(null);
  const optimisticEmojiRef = useRef<ReactionEmoji | null>(null);
  const optimisticTextRef = useRef<string | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const suggestionsTimerRef = useRef<number | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const lastMomentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!momentKey || momentKey === lastMomentRef.current) return;
    lastMomentRef.current = momentKey;
    if (suggestionsTimerRef.current !== null) window.clearTimeout(suggestionsTimerRef.current);
    setShowSuggestions(true);
    suggestionsTimerRef.current = window.setTimeout(() => {
      suggestionsTimerRef.current = null;
      if (!suggestionsRef.current?.contains(document.activeElement)) setShowSuggestions(false);
    }, 2_500);
  }, [momentKey]);

  const showReaction = useCallback((reaction: RoomReaction) => {
    setVisibleReaction(reaction);
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setVisibleReaction(null), 2_400);
  }, []);

  const sendPreset = useCallback((emoji: ReactionEmoji, text?: string) => {
    const optimisticReaction: RoomReaction = {
      id: `local-${crypto.randomUUID()}`,
      role: localRole,
      emoji,
      text: text ?? null,
      sentAt: Date.now(),
    };
    lastReactionIdRef.current = optimisticReaction.id;
    optimisticEmojiRef.current = emoji;
    optimisticTextRef.current = text ?? null;
    showReaction(optimisticReaction);
    onSend(emoji, text);
    setIsOpen(false);
    setShowAll(false);
    setShowSuggestions(false);
    triggerRef.current?.focus();
  }, [localRole, onSend, showReaction]);

  useEffect(() => {
    if (!latestReaction || latestReaction.id === lastReactionIdRef.current) return;
    lastReactionIdRef.current = latestReaction.id;
    if (
      latestReaction.role === localRole &&
      latestReaction.emoji === optimisticEmojiRef.current &&
      (latestReaction.text ?? null) === optimisticTextRef.current
    ) {
      optimisticEmojiRef.current = null;
      optimisticTextRef.current = null;
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
    if (suggestionsTimerRef.current !== null) window.clearTimeout(suggestionsTimerRef.current);
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
        onClick={() => {
          setShowSuggestions(false);
          setIsOpen((open) => !open);
        }}
      >
        <span aria-hidden="true">😂</span>
      </button>
      {showSuggestions && !disabled && !isOpen ? (
        <div
          className="reaction-suggestions"
          role="group"
          aria-label="Réagir au coup"
          ref={suggestionsRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setShowSuggestions(false);
          }}
        >
          {FAVORITE_EMOJIS.map((emoji) => (
            <button key={emoji} type="button" aria-label={REACTION_LABELS[emoji]} onClick={() => sendPreset(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
      {isOpen ? (
        <div id="reaction-picker" className="reaction-picker" role="group" aria-label="Réactions rapides">
          {FAVORITE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={REACTION_LABELS[emoji]}
              onClick={() => sendPreset(emoji)}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
          <button className="reaction-more" type="button" aria-expanded={showAll} onClick={() => setShowAll((all) => !all)}>
            {showAll ? "Moins" : "Tous"}
          </button>
          {showAll ? (
            <>
              <button
                type="button"
                className="reaction-phrase"
                aria-label={`Envoyer : ${STRIP_PHRASE}`}
                onClick={() => sendPreset(STRIP_EMOJI, STRIP_PHRASE)}
              >
                <span aria-hidden="true">{STRIP_EMOJI}</span>
                <span aria-hidden="true">{STRIP_PHRASE}</span>
              </button>
              {OTHER_EMOJIS.map((emoji) => (
                <button key={emoji} type="button" aria-label={REACTION_LABELS[emoji]} onClick={() => sendPreset(emoji)}>
                  <span aria-hidden="true">{emoji}</span>
                </button>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
      {visibleReaction ? (
        <ReactionToast
          key={visibleReaction.id}
          author={reactionAuthor}
          emoji={visibleReaction.emoji}
          text={visibleReaction.text}
        />
      ) : null}
    </div>
  );
}
