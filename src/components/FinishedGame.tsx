import Link from "next/link";
import type { GameState } from "@/domain/game";
import { totalScore } from "@/domain/yatzy";

export function FinishedGame({ game }: { game: GameState }) {
  const humanTotal = totalScore(game.human.scores);
  const botTotal = totalScore(game.bot.scores);
  const resultTitle = humanTotal === botTotal ? "Égalité !" : humanTotal > botTotal ? "Bien joué !" : "Le bot gagne cette fois.";

  return (
    <section className="finished-card" tabIndex={-1} aria-labelledby="finished-title">
      <p className="eyebrow">PARTIE TERMINÉE</p>
      <h1 id="finished-title" tabIndex={-1}>{resultTitle}</h1>
      <div className="finished-scoreboard">
        <div><span>TOI</span><strong>{humanTotal}</strong></div>
        <div><span>BOT</span><strong>{botTotal}</strong></div>
      </div>
      <div className="finished-actions">
        <Link className="primary-action" href="/bot">Rejouer</Link>
        <Link className="secondary-action" href="/">Accueil</Link>
      </div>
    </section>
  );
}
