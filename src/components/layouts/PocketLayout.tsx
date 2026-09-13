"use client";

import type { LayoutProps } from "./types";
import { InteractiveDice, SharedMultiplayerPanel } from "./types";

export function PocketLayout(props: LayoutProps) {
  return (
    <div className="layout-pocket">
      {/* Console d'auteur : Boîtier compact tout-en-un */}
      <div className="pocket-console">
        {/* Écran supérieur vitré */}
        <section className="pocket-screen" aria-label="Écran de jeu">
          <div className="pocket-screen-glass">
            <h1 className="pocket-brand">YAZZY</h1>
            <InteractiveDice
              className="pocket-dice"
              dieClassName="pocket-die"
              faceClassName="pocket-die-face"
            />
          </div>
        </section>

        {/* Pupitre de commandes ergonomiques sous le pouce */}
        <div className="pocket-controls">
          <button
            className="pocket-btn-primary"
            type="button"
            onClick={props.onStartBot}
          >
            <strong>Solo</strong>
          </button>

          <div className="pocket-btn-row">
            <button
              className="pocket-btn-sub pocket-btn-duo"
              type="button"
              aria-expanded={props.isMultiplayerOpen}
              onClick={props.onToggleMultiplayer}
            >
              <strong>Duo</strong>
            </button>
            <button
              className="pocket-btn-sub pocket-btn-quiz"
              type="button"
              onClick={props.onStartQuiz}
            >
              <strong>Quiz</strong>
            </button>
          </div>

          <div className="pocket-boss-row">
            <label className="pocket-boss-switch">
              <input
                type="checkbox"
                checked={props.isDemonThemeEnabled}
                onChange={(e) => props.onToggleDemonTheme(e.currentTarget.checked)}
              />
              <span className="pocket-switch-track">
                <span className="pocket-switch-thumb" />
              </span>
              <span className="pocket-switch-label">Boss</span>
            </label>
          </div>
        </div>

        <SharedMultiplayerPanel props={props} className="pocket-multiplayer-panel" />
      </div>
    </div>
  );
}
