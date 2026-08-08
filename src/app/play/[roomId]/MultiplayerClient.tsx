"use client";

import { useMultiplayerGame } from "../../../hooks/useMultiplayerGame";
import { GameTable } from "../../../components/GameTable";
import { GameHeader } from "../../../components/GameHeader";
import { ScoreCard } from "../../../components/ScoreCard";
import { FinishedGame } from "../../../components/FinishedGame";
import { CATEGORY_BY_ID, scoreDice, type CategoryId } from "../../../domain/yatzy";
import { useGameKeyboard } from "../../../hooks/useGameKeyboard";
import { useEffect, useState, useMemo } from "react";
import { useProbabilityEngine } from "../../../hooks/useProbabilityEngine";
import { CATEGORY_IDS } from "../../../domain/yatzy";

export function MultiplayerClient({ roomId, isHost }: { roomId: string, isHost: boolean }) {
  const { game, roll, toggleHeld, score, hasLoaded, isFinished, isOpponentTurn } = useMultiplayerGame(roomId, isHost ? "human" : "bot");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const localPlayer = isHost ? game.human : game.bot;
  const opponentPlayer = isHost ? game.bot : game.human;
  const isMyTurn = !isOpponentTurn;

  const openCategories = useMemo(
    () => CATEGORY_IDS.filter((category) => localPlayer.scores[category] === undefined),
    [localPlayer.scores],
  );
  
  const { evaluations, isCalculating } = useProbabilityEngine(
    openCategories,
    localPlayer.dice,
    Math.max(0, 3 - localPlayer.rollNumber),
  );
  const selectedEvaluation = selectedCategory ? evaluations.find((e) => e.category === selectedCategory) : undefined;

  const handleRoll = () => {
    if (!isMyTurn || isRolling || localPlayer.rollNumber >= 3) return;
    if (localPlayer.rollNumber > 0 && localPlayer.held.every(Boolean)) return;
    roll();
    setIsRolling(true);
    setTimeout(() => setIsRolling(false), 260);
  };

  const handleScore = () => {
    if (!selectedCategory || !isMyTurn || isRolling) return;
    score(selectedCategory);
    setSelectedCategory(null);
  };

  useGameKeyboard({
    disabled: !hasLoaded || !isMyTurn || isRolling,
    canRoll: localPlayer.rollNumber < 3 && !localPlayer.held.every(Boolean),
    canScore: selectedCategory !== null && !isRolling,
    onRoll: handleRoll,
    onScore: handleScore,
    onToggleDie: toggleHeld,
  });

  if (!hasLoaded) {
    return <main className="app-loading" aria-busy="true"><p>Connexion au salon {roomId}…</p></main>;
  }

  // Wait for opponent if host and opponent hasn't connected (we can guess this if we don't have opponent state changes, but actually they join seamlessly).
  // A simple invite link display for host:
  const inviteLink = `${window.location.origin}/play/${roomId}`;

  return (
    <main className="game-shell">
      <header className="game-header">
        <a className="game-logo" href="/">YAZZY</a>
        <div className="match-score">
          <span className="match-player" data-active={isMyTurn}>
            <i className="turn-dot" /> Toi
          </span>
          <span className="score-separator">·</span>
          <span className="match-player" data-active={!isMyTurn}>
            <i className="turn-dot" /> Adv
          </span>
        </div>
        <a className="quit-link" href="/">Quitter</a>
      </header>

      {isFinished ? (
        <FinishedGame game={game} />
      ) : (
        <div className="game-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isHost && Object.keys(opponentPlayer.scores).length === 0 && (
            <div style={{ padding: 16, background: "var(--surface-muted)", border: "1px solid var(--line)", borderRadius: 12 }}>
              <p style={{ margin: "0 0 4px 0", fontSize: 14, fontWeight: "bold", color: "var(--ink)" }}>Invite ton ami à rejoindre la partie !</p>
              <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "var(--ink-soft)" }}>Partage-lui ce lien. Vous serez connectés en temps réel.</p>
              <input type="text" readOnly value={inviteLink} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--line)", background: "white", fontFamily: "monospace", fontSize: 14, cursor: "pointer" }} onClick={(e) => { e.currentTarget.select(); navigator.clipboard.writeText(e.currentTarget.value); alert("Lien copié dans le presse-papiers !"); }} />
            </div>
          )}

          <ScoreCard
            label="Feuille de score"
            humanScores={game.human.scores}
            botScores={game.bot.scores}
            dice={localPlayer.dice}
            selected={isMyTurn ? selectedCategory : null}
            canSelect={isMyTurn && localPlayer.rollNumber > 0 && !isRolling}
            isReadOnly={!isMyTurn}
            isCalculating={isMyTurn && isCalculating}
            onSelect={setSelectedCategory}
            onScore={handleScore}
            targetEvaluation={selectedEvaluation}
          />

          {isMyTurn ? (
            <GameTable
              dice={localPlayer.dice}
              held={localPlayer.held}
              rollNumber={localPlayer.rollNumber}
              selectedCategory={selectedCategory}
              isRolling={isRolling}
              isCalculating={isCalculating}
              onToggleDie={toggleHeld}
              onRoll={handleRoll}
            />
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--line)" }}>
              <div className="spinner" style={{ marginBottom: 16, fontSize: 32 }}>🎲</div>
              <p style={{ fontWeight: 600 }}>Au tour de ton adversaire...</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
