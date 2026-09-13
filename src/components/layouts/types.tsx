import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import type { DieValue } from "@/domain/yatzy";
import { DieGlyph } from "../Dice";
import { PLAYER_NAME_MAX_LENGTH } from "@/domain/playerName";
import { botAudio } from "@/lib/botAudio";

export interface LayoutProps {
  theme: string;
  isMultiplayerOpen: boolean;
  playerName: string;
  playerNameError: string;
  roomCode: string;
  roomCodeError: string;
  isDemonThemeEnabled: boolean;
  onStartBot: () => void;
  onStartQuiz: () => void;
  onStartMultiplayer: () => void;
  onToggleMultiplayer: () => void;
  onCloseMultiplayer?: () => void;
  onJoinMultiplayer: (e: React.FormEvent<HTMLFormElement>) => void;
  onPlayerNameChange: (name: string) => void;
  onPlayerNameBlur: () => void;
  onRoomCodeChange: (code: string) => void;
  onPasteRoomCode: () => void;
  onPasteRoomCodeFromField: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onToggleDemonTheme: (enabled: boolean) => void;
}

export function InteractiveDice({
  className = "hero-dice",
  dieClassName = "hero-die",
  faceClassName = "hero-die-face",
}: {
  className?: string;
  dieClassName?: string;
  faceClassName?: string;
}) {
  const [round, setRound] = useState(0);
  const [values, setValues] = useState<DieValue[]>([6, 1, 4, 3, 5]);
  const [bumps, setBumps] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setValues(Array.from({ length: 5 }, () => (1 + Math.floor(Math.random() * 6)) as DieValue));
      setRound((n) => n + 1);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  const rerollOne = (index: number) => {
    botAudio.playDiceClack();
    setValues((prev) => {
      let next: DieValue = (1 + Math.floor(Math.random() * 6)) as DieValue;
      if (prev.length > 1) {
        while (next === prev[index]) {
          next = (1 + Math.floor(Math.random() * 6)) as DieValue;
        }
      }
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
    setBumps((prev) => {
      const copy = [...prev];
      copy[index] += 1;
      return copy;
    });
  };

  return (
    <div className={className} role="group" aria-label="Cinq dés interactifs">
      {values.map((value, index) => (
        <button
          key={`${round}-${bumps[index]}-${index}`}
          className={dieClassName}
          style={{ "--i": index } as CSSProperties}
          type="button"
          onClick={() => rerollOne(index)}
          aria-label={`Dé ${index + 1}, valeur ${value}`}
        >
          <DieGlyph value={value} className={faceClassName} />
        </button>
      ))}
    </div>
  );
}

export function SharedMultiplayerPanel({
  props,
  className = "multiplayer-options",
}: {
  props: LayoutProps;
  className?: string;
}) {
  const handleClose = props.onCloseMultiplayer ?? props.onToggleMultiplayer;

  useEffect(() => {
    if (!props.isMultiplayerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [props.isMultiplayerOpen, handleClose]);

  if (!props.isMultiplayerOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="duo-modal-overlay"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <section
        id="multiplayer-options"
        role="dialog"
        aria-modal="true"
        aria-labelledby="duo-modal-title"
        className={`duo-modal-card ${className}`}
      >
        <div className="duo-modal-header">
          <h2 id="duo-modal-title" className="duo-modal-title">
            Mode Duo
          </h2>
          <button
            type="button"
            className="duo-modal-close"
            onClick={handleClose}
            aria-label="Fermer la boîte de dialogue Duo"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="player-name-field">
          <label htmlFor="player-name">Pseudo</label>
          <input
            id="player-name"
            name="player-name"
            type="text"
            value={props.playerName}
            onChange={(e) => props.onPlayerNameChange(e.currentTarget.value)}
            onBlur={props.onPlayerNameBlur}
            placeholder="Alex"
            autoComplete="nickname"
            spellCheck={false}
            maxLength={PLAYER_NAME_MAX_LENGTH}
            aria-describedby={props.playerNameError ? "player-name-error" : undefined}
            aria-invalid={props.playerNameError ? true : undefined}
          />
          {props.playerNameError ? (
            <p id="player-name-error" className="form-error" role="alert">
              {props.playerNameError}
            </p>
          ) : null}
        </div>

        <button
          className="primary-action create-room-action"
          type="button"
          onClick={props.onStartMultiplayer}
        >
          Créer
        </button>

        <div className="lobby-divider" aria-hidden="true">
          <span>ou</span>
        </div>

        <form className="lobby-code-form" onSubmit={props.onJoinMultiplayer} noValidate>
          <label className="sr-only" htmlFor="room-code">
            Code de partie
          </label>
          <div className="lobby-code-controls">
            <div className="room-code-field">
              <input
                id="room-code"
                name="room-code"
                type="text"
                value={props.roomCode}
                onChange={(e) => props.onRoomCodeChange(e.currentTarget.value)}
                onPaste={props.onPasteRoomCodeFromField}
                placeholder="ABC123"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                maxLength={6}
                aria-describedby={props.roomCodeError ? "room-code-error" : undefined}
                aria-invalid={props.roomCodeError ? true : undefined}
              />
              <button className="paste-code-action" type="button" onClick={props.onPasteRoomCode}>
                Coller
              </button>
              <button className="join-code-action" type="submit">
                Rejoindre
              </button>
            </div>
          </div>
          {props.roomCodeError ? (
            <p id="room-code-error" className="form-error" role="alert">
              {props.roomCodeError}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
