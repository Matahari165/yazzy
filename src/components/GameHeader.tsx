import Link from "next/link";
import type { GameState } from "@/domain/game";
import { getBotPolicy } from "@/domain/bots";
import { totalScore } from "@/domain/yatzy";

export function GameHeader({ game, isCoachEnabled, onToggleCoach }: { game: GameState, isCoachEnabled?: boolean, onToggleCoach?: () => void }) {
  const humanTotal = totalScore(game.human.scores);
  const botTotal = totalScore(game.bot.scores);
  const isHumanTurn = game.activePlayer === "human";

  return (
    <header className="game-header">
      <Link className="game-logo" href="/" aria-label="Yazzy, revenir à l’accueil">YAZZY</Link>
      {onToggleCoach ? (
         <button onClick={onToggleCoach} style={{ background: isCoachEnabled ? 'var(--green-soft)' : 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', color: isCoachEnabled ? 'var(--green)' : 'var(--ink-soft)', fontSize: 11, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 150ms' }} aria-pressed={isCoachEnabled}>
           💡 Coach {isCoachEnabled ? "ON" : "OFF"}
         </button>
      ) : game.mode === "bot" && game.botLevel ? (
         <span className="mode-label">BOT · {getBotPolicy(game.botLevel).label}</span>
      ) : (
         <span className="mode-label">MULTI</span>
      )}
      <div
        className="match-score"
        role="group"
        aria-label={`Score : toi ${humanTotal}, bot ${botTotal}. ${isHumanTurn ? "À toi de jouer." : "Le bot joue."}`}
      >
        <span className="match-player" data-active={isHumanTurn} aria-hidden="true">
          <i className="turn-dot" aria-hidden="true" />
          Toi <strong>{humanTotal}</strong>
        </span>
        <span className="score-separator" aria-hidden="true">·</span>
        <span className="match-player" data-active={!isHumanTurn} aria-hidden="true">
          <i className="turn-dot" aria-hidden="true" />
          Bot <strong>{botTotal}</strong>
        </span>
      </div>
      <Link className="quit-link" href="/">Quitter</Link>
    </header>
  );
}
