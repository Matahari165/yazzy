"use client";

import type { LayoutProps } from "./types";
import { InteractiveDice, SharedMultiplayerPanel } from "./types";

export function EditorialLayout(props: LayoutProps) {
  return (
    <div className="layout-editorial">
      <header className="editorial-header">
        <h1 className="editorial-title">Yazzy</h1>
      </header>

      {/* Guéridon de dés d'été sur filet */}
      <section className="editorial-table" aria-label="Les dés du club">
        <div className="editorial-dice-strip">
          <InteractiveDice
            className="editorial-dice"
            dieClassName="editorial-die"
            faceClassName="editorial-die-face"
          />
        </div>
      </section>

      {/* Sommaire typographique en galets étagés */}
      <nav className="editorial-menu" aria-label="Modes de jeu">
        <button
          className="editorial-pill editorial-pill-solo"
          type="button"
          onClick={props.onStartBot}
        >
          <span className="editorial-num">01</span>
          <strong>Solo</strong>
          <span className="editorial-arrow" aria-hidden="true">→</span>
        </button>

        <button
          className="editorial-pill editorial-pill-duo"
          type="button"
          aria-expanded={props.isMultiplayerOpen}
          onClick={props.onToggleMultiplayer}
        >
          <span className="editorial-num">02</span>
          <strong>Duo</strong>
          <span className="editorial-arrow" aria-hidden="true">{props.isMultiplayerOpen ? "↓" : "→"}</span>
        </button>

        <button
          className="editorial-pill editorial-pill-quiz"
          type="button"
          onClick={props.onStartQuiz}
        >
          <span className="editorial-num">03</span>
          <strong>Quiz</strong>
          <span className="editorial-arrow" aria-hidden="true">→</span>
        </button>
      </nav>

      <SharedMultiplayerPanel props={props} className="editorial-multiplayer-panel" />

      <footer className="editorial-footer">
        <label className="editorial-boss-toggle">
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
