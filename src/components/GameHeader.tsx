import Link from "next/link";
import type { GameState } from "@/domain/game";
import { getBotPolicy } from "@/domain/bots";
import { totalScore } from "@/domain/yatzy";

export function GameHeader({ game }: { game: GameState }) {
  const humanTotal = totalScore(game.human.scores);
  const botTotal = totalScore(game.bot.scores);
  const isHumanTurn = game.activePlayer === "human";

  return (
    <header className="game-header">
      <Link className="game-logo" href="/" aria-label="Yazzy, revenir à l’accueil">YAZZY</Link>
      {game.mode === "bot" && game.botLevel ? (
         <span className="mode-label">BOT · {getBotPolicy(game.botLevel).label}</span>
      ) : (
         <span className="mode-label">MULTI</span>
      )}
      <div
        className="match-score"
        role="group"
        aria-label={`Score : toi ${humanTotal}, bot ${botTotal}. ${isHumanTurn ? "À toi de jouer." : "Le bot joue."}`}
      >
        <span className="match-player" data-active={isHumanTurn} data-score-column="player" aria-hidden="true">
          <i className="turn-dot" aria-hidden="true" />
          Toi <strong>{humanTotal}</strong>
        </span>
        <span className="match-player" data-active={!isHumanTurn} data-score-column="opponent" aria-hidden="true">
          <i className="turn-dot" aria-hidden="true" />
          Bot <strong>{botTotal}</strong>
        </span>
      </div>
      <Link className="quit-link" href="/">Quitter</Link>
    </header>
  );
}
