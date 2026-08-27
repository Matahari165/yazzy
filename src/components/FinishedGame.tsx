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
};

type GameOutcome = "win" | "loss" | "tie";

const pluralizePoints = (points: number) => `point${points === 1 ? "" : "s"}`;

const WinnerCrown = () => (
  <svg className="finished-winner-crown" viewBox="0 0 64 44" aria-hidden="true" focusable="false">
    <path className="finished-crown" d="m8 19 9 8 7-13 8 13 8-13 7 13 9-8-3 18H11L8 19Z" />
    <path className="finished-crown-base" d="M11 37h42v5H11z" />
  </svg>
);

const FinishedParticles = () => (
  <div className="finished-particles" aria-hidden="true">
    {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
  </div>
);

export function FinishedGame({
  game,
  localPlayerId = "human",
  localRole,
  onRematch,
  rematchRequested = false,
  localName = "Toi",
  opponentName = "Ami",
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
  const margin = Math.abs(localPoints - opponentPoints);
  const mode = isMultiplayer ? "duo" : "bot";
  const opponentLabel = isMultiplayer ? opponentName : "Bot";
  const playerLabel = isMultiplayer ? localName : "Toi";
  const resultTitle = isTie
    ? "ÉGALITÉ !"
    : isWinner
      ? mode === "bot" ? "TU AS GAGNÉ !" : `${playerLabel} A GAGNÉ !`
      : mode === "bot" ? "LE BOT A GAGNÉ !" : `${opponentLabel} A GAGNÉ !`;
  const resultSummary = isTie
    ? `${playerLabel} et ${opponentLabel} terminent avec ${localPoints} points.`
    : isWinner
      ? mode === "bot"
        ? `Tu bats le bot avec ${margin} ${pluralizePoints(margin)} d’avance.`
        : `${playerLabel} prend la partie avec ${margin} ${pluralizePoints(margin)} d’avance.`
      : mode === "bot"
        ? `Le bot prend la partie avec ${margin} ${pluralizePoints(margin)} d’avance.`
        : `${opponentLabel} prend la partie avec ${margin} ${pluralizePoints(margin)} d’avance.`;

  const playerIsWinner = isWinner;
  const opponentIsWinner = !isWinner && !isTie;

  return (
    <section
      className="finished-card finished-celebration"
      tabIndex={-1}
      aria-labelledby="finished-title"
      aria-describedby="finished-summary"
      aria-live="polite"
      data-game-mode={mode}
      data-outcome={outcome}
    >
      <FinishedParticles />

      <div className="finished-hero" data-outcome={outcome}>
        <p className="eyebrow finished-eyebrow">PARTIE TERMINÉE</p>
        <div className="finished-result-mark" aria-hidden="true">
          {outcome === "tie" ? "↔" : outcome === "win" ? "✦" : "↘"}
        </div>
        <h1 id="finished-title" className="finished-result" tabIndex={-1}>
          {resultTitle}
        </h1>
        <p id="finished-summary" className="finished-summary">{resultSummary}</p>
      </div>

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
              <span className="finished-winner-mark"><WinnerCrown /></span>
            ) : isTie ? (
              <span className="finished-tie-badge">ÉGALITÉ</span>
            ) : null}
          </div>
          <strong className="finished-score-number" data-score={localPoints}>{localPoints}</strong>
          <span className="finished-score-caption">points</span>
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
              <span className="finished-winner-mark"><WinnerCrown /></span>
            ) : isTie ? (
              <span className="finished-tie-badge">ÉGALITÉ</span>
            ) : null}
          </div>
          <strong className="finished-score-number" data-score={opponentPoints}>{opponentPoints}</strong>
          <span className="finished-score-caption">points</span>
        </article>
      </div>

      <p className="finished-margin" data-margin={margin}>
        <span>Écart final</span>
        <strong>{margin} {pluralizePoints(margin)}</strong>
      </p>

      <div className="finished-actions">
        {isMultiplayer && onRematch ? (
          <button className="primary-action" type="button" disabled={rematchRequested} onClick={onRematch}>
            {rematchRequested ? `En attente de ${opponentName}…` : "Proposer une revanche"}
          </button>
        ) : (
          <Link className="primary-action" href="/bot">Rejouer</Link>
        )}
        <Link className="secondary-action" href="/">Accueil</Link>
      </div>
    </section>
  );
}
