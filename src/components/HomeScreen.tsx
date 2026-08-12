"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isFinished, type GameState } from "@/domain/game";
import { CATEGORY_IDS } from "@/domain/yatzy";
import { readStoredGame } from "@/lib/gameStorage";

export function HomeScreen() {
  const router = useRouter();
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

  const startMultiplayer = () => {
    const roomId = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
    router.push(`/play/${roomId}`);
  };

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

        <div className="lobby-actions">
          {canResume ? (
            <Link className="secondary-action" href="/game">
              <span>Reprendre la partie</span>
              <small>Tour {Math.min(savedGame.turn, CATEGORY_IDS.length)} sur {CATEGORY_IDS.length}</small>
            </Link>
          ) : null}
          <Link className="primary-action" href="/bot">Jouer contre un bot</Link>
          <button className="primary-action" type="button" onClick={startMultiplayer}>
            <span>Jouer avec un ami</span>
            <small>Lien privé · en ligne</small>
          </button>
        </div>

        <p className="lobby-footnote">Aucune inscription nécessaire. Les parties en ligne sont privées et temporaires.</p>
      </section>
    </main>
  );
}
