"use client";

import { useSearchParams } from "next/navigation";
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

export function MultiplayerClient({ roomId }: { roomId: string }) {
  const searchParams = useSearchParams();
  const isHost = searchParams.get("host") === "true";
  
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
        <div className="game-content">
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
            <div style={{ padding: 20, textAlign: "center", color: "var(--ink-soft)" }}>
              <div className="spinner" style={{ marginBottom: 16 }}>🎲</div>
              <p>Au tour de ton adversaire...</p>
              {isHost && Object.keys(opponentPlayer.scores).length === 0 && (
                <div style={{ marginTop: 24, padding: 16, background: "var(--surface-muted)", borderRadius: 8 }}>
                  <p style={{ marginBottom: 8, fontSize: 13 }}>Envoie ce lien à ton ami :</p>
                  <input type="text" readOnly value={inviteLink} style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid var(--line)", fontFamily: "monospace", fontSize: 14 }} onClick={(e) => e.currentTarget.select()} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
