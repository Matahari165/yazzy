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

  const opponentLabel = isMultiplayer ? opponentName : "Bot";
  const playerLabel = isMultiplayer ? localName : "Toi";

  return (
    <section className="finished-card" tabIndex={-1} aria-labelledby="finished-title">
      <p className="eyebrow">PARTIE TERMINÉE</p>
      <h1 id="finished-title" className="finished-result">
        {isTie
          ? "Match nul !"
          : isWinner
            ? "Bravo, tu as gagné !"
            : isMultiplayer
              ? `${opponentName} a gagné !`
              : "Le bot a gagné !"}
      </h1>
      <div className="finished-scoreboard">
        <div data-winner={isWinner}>
          <strong>{localPoints}</strong>
          <span>{playerLabel}</span>
        </div>
        <div data-winner={!isWinner && !isTie}>
          <strong>{opponentPoints}</strong>
          <span>{opponentLabel}</span>
        </div>
      </div>
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
