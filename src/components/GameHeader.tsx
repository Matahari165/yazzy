import Link from "next/link";
import type { GameState } from "@/domain/game";
import { getBotPolicy } from "@/domain/bots";
import { totalScore } from "@/domain/yatzy";

export function GameHeader({ game }: { game: GameState }) {
  const humanTotal = totalScore(game.human.scores);
  const botTotal = totalScore(game.bot.scores);
  const isHumanTurn = game.activePlayer === "human";

  return (
    <>
      <header className="game-header">
        <Link className="game-logo" href="/" aria-label="Yazzy, revenir à l’accueil">YAZZY</Link>
        <span className="mode-label">CONTRE BOT · {getBotPolicy(game.botLevel).label}</span>
        <Link className="quit-link" href="/">Quitter</Link>
      </header>
      <section className="game-overview" aria-label="État de la partie">
        <div className="round-heading">
          <p className="eyebrow">TOUR {Math.min(game.turn, 15)} / 15</p>
          <p className="active-player" data-active={isHumanTurn}>{isHumanTurn ? "À toi de jouer" : "Le bot joue"}</p>
        </div>
        <div className="player-scores">
          <div className="player-score" data-active={isHumanTurn}>
            <span>TOI</span>
            <strong>{humanTotal}</strong>
          </div>
          <div className="player-score" data-active={!isHumanTurn}>
            <span>BOT</span>
            <strong>{botTotal}</strong>
          </div>
        </div>
        <progress className="game-progress" max={15} value={Object.keys(game.human.scores).length} aria-label={`${Object.keys(game.human.scores).length} tours terminés sur 15`} />
      </section>
    </>
  );
}
