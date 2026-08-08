import Link from "next/link";
import type { GameState } from "@/domain/game";
import { totalScore } from "@/domain/yatzy";

export function FinishedGame({ game, localPlayerId = "human" }: { game: GameState, localPlayerId?: "human" | "bot" }) {
  const humanPoints = totalScore(game.human.scores);
  const botPoints = totalScore(game.bot.scores);
  const localPoints = localPlayerId === "human" ? humanPoints : botPoints;
  const opponentPoints = localPlayerId === "human" ? botPoints : humanPoints;
  const isWinner = localPoints >= opponentPoints;

  return (
    <section className="finished-card" tabIndex={-1} aria-labelledby="finished-title">
      <p className="eyebrow">PARTIE TERMINÉE</p>
      <p style={{ fontSize: 24, margin: '16px 0' }}>
        {isWinner ? "🎉 Bravo, tu as gagné !" : (game.mode === "multiplayer" ? "😢 Ton adversaire a gagné !" : "🤖 Le bot a gagné !")}
      </p>
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: isWinner ? 'var(--green)' : 'var(--ink)' }}>{localPoints}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Toi</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: !isWinner ? 'var(--green)' : 'var(--ink)' }}>{opponentPoints}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{game.mode === "multiplayer" ? "Adversaire" : "Bot"}</div>
        </div>
      </div>
      <div className="finished-actions">
        <Link className="primary-action" href="/bot">Rejouer</Link>
        <Link className="secondary-action" href="/">Accueil</Link>
      </div>
    </section>
  );
}
