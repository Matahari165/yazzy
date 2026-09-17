"use client";

import type { LayoutProps } from "./types";
import { InteractiveDice, SharedMultiplayerPanel } from "./types";

export function CloudLayout(props: LayoutProps) {
  return (
    <div className="layout-cloud">
      <header className="cloud-header">
        <h1 className="cloud-title">Yazzy</h1>
      </header>

      {/* Coussin moelleux flottant pour les dés */}
      <section className="cloud-pillow-stage" aria-label="Les dés sur coussin">
        <div className="cloud-pillow">
          <InteractiveDice
            className="cloud-dice"
            dieClassName="cloud-die"
            faceClassName="cloud-die-face"
          />
        </div>
      </section>

      {/* Boutons en capsules marshmallow épaisses 3D douces */}
      <div className="cloud-actions">
        <button
          className="cloud-btn cloud-btn-solo"
          type="button"
          onClick={props.onStartBot}
        >
          <strong>Solo</strong>
        </button>

        <div className="cloud-duo-row">
          <button
            className="cloud-btn cloud-btn-duo"
            type="button"
            aria-expanded={props.isMultiplayerOpen}
            aria-controls="multiplayer-options"
            onClick={props.onToggleMultiplayer}
          >
            <strong>Duo</strong>
          </button>

          <button
            className="cloud-btn cloud-btn-quiz"
            type="button"
            onClick={props.onStartQuiz}
          >
            <strong>Quiz</strong>
          </button>
        </div>
      </div>

      <SharedMultiplayerPanel props={props} className="cloud-multiplayer-panel" />

      <footer className="cloud-footer">
        <label className="cloud-boss-toggle">
          <input
            type="checkbox"
            checked={props.isDemonThemeEnabled}
            onChange={(e) => props.onToggleDemonTheme(e.currentTarget.checked)}
          />
          <span className="cloud-boss-capsule">Mode Boss</span>
        </label>
      </footer>
    </div>
  );
}
