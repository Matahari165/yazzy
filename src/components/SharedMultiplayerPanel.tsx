"use client";

import { useEffect, useRef, useState } from "react";
import { PLAYER_NAME_MAX_LENGTH } from "@/domain/playerName";
import type { LayoutProps } from "./layouts/types";

export interface SharedMultiplayerPanelProps {
  props: LayoutProps;
  className?: string;
}

export function SharedMultiplayerPanel({
  props,
  className = "multiplayer-options",
}: SharedMultiplayerPanelProps) {
  const handleClose = props.onCloseMultiplayer ?? props.onToggleMultiplayer;
  const handleCloseRef = useRef(handleClose);
  const modalRef = useRef<HTMLElement>(null);
  const [showCustomRoom, setShowCustomRoom] = useState(false);

  useEffect(() => {
    handleCloseRef.current = handleClose;
  }, [handleClose]);

  useEffect(() => {
    if (!props.isMultiplayerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      modalRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [props.isMultiplayerOpen]);

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
        ref={modalRef}
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
          onClick={props.onPlayDuo}
        >
          Jouer ensemble
        </button>

        <div className="duo-secondary-toggle-wrap">
          <button
            type="button"
            className="duo-secondary-toggle"
            aria-expanded={showCustomRoom}
            onClick={() => setShowCustomRoom((prev) => !prev)}
          >
            {showCustomRoom ? "Masquer les options" : "Autre salon…"}
          </button>
        </div>

        {showCustomRoom ? (
          <div className="duo-custom-room-section">
            <button
              className="secondary-action create-room-action"
              type="button"
              onClick={props.onStartMultiplayer}
            >
              Créer un salon temporaire
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
          </div>
        ) : null}
      </section>
    </div>
  );
}
