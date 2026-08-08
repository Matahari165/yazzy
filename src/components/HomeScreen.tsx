"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isFinished, type GameState } from "@/domain/game";
import { readStoredGame } from "@/lib/gameStorage";

export function HomeScreen() {
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSavedGame(readStoredGame());
      setHasLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const canResume = hasLoaded && savedGame !== null && !isFinished(savedGame);

  return (
    <main id="main-content" className="lobby-shell">
      <section className="lobby-card" aria-labelledby="lobby-title">
        <header className="lobby-brand">
          <span className="logo-mark" aria-hidden="true"><span /><span /><span /></span>
          <div>
            <p className="eyebrow">YAZZY</p>
            <h1 id="lobby-title">Le Yatzy simple et malin</h1>
          </div>
        </header>

        <p className="lobby-lead">Une partie claire, des décisions qui comptent, et un bot qui joue vraiment ses dés.</p>

        <div className="lobby-actions">
          {canResume ? (
            <Link className="secondary-action" href="/game">
              <span>Reprendre la partie</span>
              <small>Tour {Math.min(savedGame.turn, 15)} sur 15</small>
            </Link>
          ) : null}
          <Link className="primary-action" href="/bot">Jouer contre un bot</Link>
          <button className="disabled-action" type="button" disabled aria-disabled="true">
            <span>Jouer avec un ami</span>
            <small>Bientôt</small>
          </button>
        </div>

        <p className="lobby-footnote">Aucune inscription nécessaire. Ta partie reste dans ce navigateur.</p>
      </section>
    </main>
  );
}
