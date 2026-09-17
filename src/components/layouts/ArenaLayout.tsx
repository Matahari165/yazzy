"use client";

import type { LayoutProps } from "./types";
import { InteractiveDice, SharedMultiplayerPanel } from "./types";

export function ArenaLayout(props: LayoutProps) {
  return (
    <div className="layout-arena">
      <header className="arena-header">
        <h1 className="arena-brand">Yazzy</h1>
      </header>

      {/* Arène centrale ovale feutrée pour les dés */}
      <section className="arena-tray" aria-label="Piste de dés">
        <div className="arena-felt">
          <InteractiveDice
            className="arena-dice-group"
            dieClassName="arena-die"
            faceClassName="arena-die-face"
          />
        </div>
      </section>

      {/* Actions de jeu : Palet Solo dominant + Dock Duo/Quiz */}
      <div className="arena-actions">
        <button
          className="arena-palet-solo"
          type="button"
          onClick={props.onStartBot}
        >
          <span className="arena-palet-pip" aria-hidden="true" />
          <strong>Solo</strong>
        </button>

        <div className="arena-dock">
          <button
            className="arena-dock-btn arena-dock-duo"
            type="button"
            aria-expanded={props.isMultiplayerOpen}
            aria-controls="multiplayer-options"
            onClick={props.onToggleMultiplayer}
          >
            <strong>Duo</strong>
          </button>
          <button
            className="arena-dock-btn arena-dock-quiz"
            type="button"
            onClick={props.onStartQuiz}
          >
            <strong>Quiz</strong>
          </button>
        </div>
      </div>

      <SharedMultiplayerPanel props={props} className="arena-multiplayer-panel" />

      <footer className="arena-footer">
        <label className="arena-boss-switch">
          <input
            type="checkbox"
            checked={props.isDemonThemeEnabled}
            onChange={(e) => props.onToggleDemonTheme(e.currentTarget.checked)}
          />
          <span>Mode Boss</span>
        </label>
      </footer>
    </div>
  );
}
