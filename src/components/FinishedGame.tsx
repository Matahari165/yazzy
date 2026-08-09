import Link from "next/link";
import type { GameState } from "@/domain/game";
import type { MultiplayerGameState } from "@/domain/multiplayer";
import { totalScore } from "@/domain/yatzy";

type FinishedGameProps = {
  game: GameState | MultiplayerGameState;
  localPlayerId?: "human" | "bot";
  localRole?: "player1" | "player2";
  onRematch?: () => void;
};

export function FinishedGame({ game, localPlayerId = "human", localRole, onRematch }: FinishedGameProps) {
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

  const opponentLabel = isMultiplayer ? "Adversaire" : "Bot";

  return (
    <section className="finished-card" tabIndex={-1} aria-labelledby="finished-title">
      <p className="eyebrow">PARTIE TERMINÉE</p>
      <p style={{ fontSize: 24, margin: '16px 0' }}>
        {isTie
          ? "🤝 Match nul !"
          : isWinner
            ? "🎉 Bravo, tu as gagné !"
            : isMultiplayer
              ? "😢 Ton adversaire a gagné !"
              : "🤖 Le bot a gagné !"}
      </p>
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: isWinner ? 'var(--green)' : 'var(--ink)' }}>{localPoints}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Toi</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: !isWinner && !isTie ? 'var(--green)' : 'var(--ink)' }}>{opponentPoints}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{opponentLabel}</div>
        </div>
      </div>
      <div className="finished-actions">
        {isMultiplayer && onRematch ? (
          <button className="primary-action" onClick={onRematch}>🔄 Revanche</button>
        ) : (
          <Link className="primary-action" href="/bot">Rejouer</Link>
        )}
        <Link className="secondary-action" href="/">Accueil</Link>
      </div>
    </section>
  );
}
