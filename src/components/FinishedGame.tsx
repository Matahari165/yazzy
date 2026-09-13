import Link from "next/link";
import type { GameState } from "@/domain/game";
import type { MultiplayerGameState } from "@/domain/multiplayer";
import { totalScore } from "@/domain/yatzy";

type FinishedGameProps = {
  game: GameState | MultiplayerGameState;
  localPlayerId?: "human" | "bot";
  localRole?: "player1" | "player2";
  onRematch?: () => void;
  rematchRequested?: boolean;
  localName?: string;
  opponentName?: string;
  onLeave?: () => void;
};

type GameOutcome = "win" | "loss" | "tie";

export function FinishedGame({
  game,
  localPlayerId = "human",
  localRole,
  onRematch,
  rematchRequested = false,
  localName = "Toi",
  opponentName = "Ami",
  onLeave,
}: FinishedGameProps) {
  const isMultiplayer = "player1" in game;

  let localPoints: number;
  let opponentPoints: number;

  if (isMultiplayer) {
    const p1Scores = game.player1?.state.scores ?? {};
    const p2Scores = game.player2?.state.scores ?? {};
    localPoints = totalScore(localRole === "player1" ? p1Scores : p2Scores);
    opponentPoints = totalScore(localRole === "player1" ? p2Scores : p1Scores);
  } else {
    const humanPoints = totalScore(game.human.scores);
    const botPoints = totalScore(game.bot.scores);
    localPoints = localPlayerId === "human" ? humanPoints : botPoints;
    opponentPoints = localPlayerId === "human" ? botPoints : humanPoints;
  }

  const isTie = localPoints === opponentPoints;
  const isWinner = localPoints > opponentPoints;
  const outcome: GameOutcome = isTie ? "tie" : isWinner ? "win" : "loss";
  const mode = isMultiplayer ? "duo" : "bot";
  const opponentLabel = isMultiplayer ? opponentName : "Bot";
  const playerLabel = isMultiplayer ? localName : "Toi";
  const resultTitle = isTie ? "Égalité" : isWinner ? "Victoire" : "Défaite";

  const playerIsWinner = isWinner;
  const opponentIsWinner = !isWinner && !isTie;

  return (
    <section
      className="finished-card finished-celebration"
      tabIndex={-1}
      aria-labelledby="finished-title"
      aria-live="polite"
      data-game-mode={mode}
      data-outcome={outcome}
    >
      <header className="finished-hero" data-outcome={outcome}>
        <h1 id="finished-title" className="finished-result" tabIndex={-1}>
          {resultTitle}
        </h1>
      </header>

      <div className="finished-scoreboard" role="list" aria-label="Scores finaux">
        <article
          className="finished-player-score"
          role="listitem"
          data-score-column="player"
          data-winner={playerIsWinner}
          data-local-player="true"
          aria-label={`${playerLabel} : ${localPoints} points${playerIsWinner ? ", gagnant" : isTie ? ", égalité" : ""}`}
        >
          <div className="finished-score-topline">
            <span className="finished-player-name">{playerLabel}</span>
            {playerIsWinner ? (
              <span className="finished-winner-mark" aria-hidden="true">✦</span>
            ) : null}
          </div>
          <strong className="finished-score-number" data-score={localPoints}>{localPoints}</strong>
        </article>

        <article
          className="finished-player-score"
          role="listitem"
          data-score-column="opponent"
          data-winner={opponentIsWinner}
          data-local-player="false"
          aria-label={`${opponentLabel} : ${opponentPoints} points${opponentIsWinner ? ", gagnant" : isTie ? ", égalité" : ""}`}
        >
          <div className="finished-score-topline">
            <span className="finished-player-name">{opponentLabel}</span>
            {opponentIsWinner ? (
              <span className="finished-winner-mark" aria-hidden="true">✦</span>
            ) : null}
          </div>
          <strong className="finished-score-number" data-score={opponentPoints}>{opponentPoints}</strong>
        </article>
      </div>

      <div className="finished-actions">
        {isMultiplayer && onRematch ? (
          <button className="primary-action" type="button" disabled={rematchRequested} onClick={onRematch}>
            {rematchRequested ? "En attente…" : "Revanche"}
          </button>
        ) : (
          <Link className="primary-action" href="/bot" onClick={onLeave}>Rejouer</Link>
        )}
        <Link className="secondary-action" href="/" onClick={onLeave}>Accueil</Link>
      </div>
    </section>
  );
}
