"use client";

import type { LayoutProps } from "./types";
import { InteractiveDice, SharedMultiplayerPanel } from "./types";

export function PebbleLayout(props: LayoutProps) {
  return (
    <div className="layout-pebble">
      <header className="pebble-header">
        <h1 className="pebble-title">Yazzy</h1>
      </header>

      {/* Alvéole céramique douce pour les dés */}
      <section className="pebble-tray" aria-label="Alvéole des dés">
        <InteractiveDice
          className="pebble-dice-cluster"
          dieClassName="pebble-die"
          faceClassName="pebble-die-face"
        />
      </section>

      {/* Sculpture asymétrique de 3 galets de tailles différentes en quinconce */}
      <div className="pebble-cluster">
        {/* Grand galet dominant Solo */}
        <button
          className="pebble-shape pebble-solo"
          type="button"
          onClick={props.onStartBot}
        >
          <span className="pebble-dot" aria-hidden="true" />
          <strong>Solo</strong>
        </button>

        {/* Galet moyen Duo */}
        <button
          className="pebble-shape pebble-duo"
          type="button"
          aria-expanded={props.isMultiplayerOpen}
          onClick={props.onToggleMultiplayer}
        >
          <strong>Duo</strong>
        </button>

        {/* Galet horizontal Quiz */}
        <button
          className="pebble-shape pebble-quiz"
          type="button"
          onClick={props.onStartQuiz}
        >
          <strong>Quiz</strong>
        </button>
      </div>

      <SharedMultiplayerPanel props={props} className="pebble-multiplayer-panel" />

      <footer className="pebble-footer">
        <label className="pebble-boss-toggle">
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
