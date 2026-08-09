"use client";

import Link from "next/link";
import { useMultiplayerGame } from "../../../hooks/useMultiplayerGame";
import { GameTable } from "../../../components/GameTable";
import { ScoreCard } from "../../../components/ScoreCard";
import { FinishedGame } from "../../../components/FinishedGame";
import { type CategoryId } from "../../../domain/yatzy";
import { useGameKeyboard } from "../../../hooks/useGameKeyboard";
import { useState, useMemo } from "react";
import { useProbabilityEngine } from "../../../hooks/useProbabilityEngine";
import { CATEGORY_IDS } from "../../../domain/yatzy";

function getInviteLink(roomId: string): string {
  return `${window.location.origin}/play/${roomId}`;
}

export function MultiplayerClient({ roomId }: { roomId: string }) {
  const {
    game,
    localRole,
    opponentOnline,
    status,
    roll,
    toggleHeld,
    score,
    rematch,
    isMyTurn,
    localPlayer,
    opponentPlayer,
  } = useMultiplayerGame(roomId);

  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [inviteLink] = useState(() =>
    typeof window !== "undefined" ? getInviteLink(roomId) : ""
  );

  const localState = localPlayer?.state;
  const opponentState = opponentPlayer?.state;

  const openCategories = useMemo(
    () => CATEGORY_IDS.filter((category) => localState?.scores[category] === undefined),
    [localState?.scores],
  );

  const { evaluations, isCalculating } = useProbabilityEngine(
    openCategories,
    localState?.dice ?? [],
    Math.max(0, 3 - (localState?.rollNumber ?? 0)),
  );
  const selectedEvaluation = selectedCategory ? evaluations.find((e) => e.category === selectedCategory) : undefined;

  const handleRoll = () => {
    if (!isMyTurn || isRolling || !localState || localState.rollNumber >= 3) return;
    if (localState.rollNumber > 0 && localState.held.every(Boolean)) return;
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
    disabled: status !== "playing" || !isMyTurn || isRolling,
    canRoll: !!localState && localState.rollNumber < 3 && !localState.held.every(Boolean),
    canScore: selectedCategory !== null && !isRolling,
    onRoll: handleRoll,
    onScore: handleScore,
    onToggleDie: toggleHeld,
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  if (status === "connecting") {
    return (
      <main className="app-loading" aria-busy="true">
        <p>Connexion au salon {roomId}…</p>
      </main>
    );
  }

  if (status === "room_full") {
    return (
      <main className="app-loading">
        <p>🚫 Ce salon est complet. Deux joueurs sont déjà connectés.</p>
        <Link href="/" style={{ marginTop: 16, color: "var(--accent)" }}>Retour à l&apos;accueil</Link>
      </main>
    );
  }

  if (status === "waiting") {
    return (
      <main className="game-shell">
        <header className="game-header">
          <Link className="game-logo" href="/">YAZZY</Link>
          <div className="match-score">
            <span className="match-player" data-active={true}>
              <i className="turn-dot" /> Toi
            </span>
            <span className="score-separator">·</span>
            <span className="match-player" data-active={false}>
              <i className="turn-dot" /> En attente…
            </span>
          </div>
          <Link className="quit-link" href="/">Quitter</Link>
        </header>

        <div className="game-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: "40px 16px" }}>
          <div style={{ fontSize: 48 }}>🎲</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: 0 }}>En attente de ton adversaire</h2>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0, textAlign: "center" }}>
            Partage ce lien à ton ami pour qu&apos;il rejoigne la partie.
          </p>
          <div style={{ width: "100%", maxWidth: 400 }}>
            <input
              type="text"
              readOnly
              value={inviteLink}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                fontFamily: "monospace",
                fontSize: 14,
                cursor: "pointer",
                boxSizing: "border-box",
              }}
              onClick={(e) => {
                e.currentTarget.select();
                handleCopyLink();
              }}
            />
            <button
              className="primary"
              style={{ width: "100%", marginTop: 8 }}
              onClick={handleCopyLink}
            >
              📋 Copier le lien
            </button>
          </div>
          <div className="spinner" style={{ marginTop: 16, fontSize: 24 }}>⏳</div>
        </div>
      </main>
    );
  }

  if (!game || !localState || !opponentState) {
    return (
      <main className="app-loading" aria-busy="true">
        <p>Chargement de la partie…</p>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <Link className="game-logo" href="/">YAZZY</Link>
        <div className="match-score">
          <span className="match-player" data-active={isMyTurn}>
            <i className="turn-dot" /> Toi
          </span>
          <span className="score-separator">·</span>
          <span className="match-player" data-active={!isMyTurn}>
            <i className="turn-dot" style={opponentOnline ? {} : { opacity: 0.3 }} /> Adv {!opponentOnline && <small style={{ fontSize: 10, opacity: 0.5 }}>(hors ligne)</small>}
          </span>
        </div>
        <Link className="quit-link" href="/">Quitter</Link>
      </header>

      {status === "finished" ? (
        <FinishedGame
          game={game}
          localRole={localRole ?? undefined}
          onRematch={rematch}
        />
      ) : (
        <div className="game-content">
          {!opponentOnline && (
            <div style={{ gridColumn: "1 / -1", padding: 12, background: "var(--surface-muted)", border: "1px solid var(--line)", borderRadius: 12, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
                ⚠️ Ton adversaire est déconnecté. Il peut revenir à tout moment.
              </p>
            </div>
          )}

          <ScoreCard
            label="Feuille de score"
            playerLabel="Toi"
            opponentLabel="Adv"
            humanScores={localState.scores}
            botScores={opponentState.scores}
            dice={localState.dice}
            selected={isMyTurn ? selectedCategory : null}
            canSelect={isMyTurn && localState.rollNumber > 0 && !isRolling}
            isReadOnly={!isMyTurn}
            isCalculating={isMyTurn && isCalculating}
            onSelect={setSelectedCategory}
            onScore={handleScore}
            targetEvaluation={selectedEvaluation}
          />

          {isMyTurn ? (
            <GameTable
              dice={localState.dice}
              held={localState.held}
              rollNumber={localState.rollNumber}
              selectedCategory={selectedCategory}
              isRolling={isRolling}
              isCalculating={isCalculating}
              onToggleDie={toggleHeld}
              onRoll={handleRoll}
            />
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--line)" }}>
              {opponentState.dice.length > 0 ? (
                <>
                  <p style={{ fontWeight: 600, marginBottom: 12 }}>Tour de ton adversaire</p>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                    {opponentState.dice.map((die, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: opponentState.held[i] ? "var(--accent)" : "var(--surface-muted)",
                          color: opponentState.held[i] ? "white" : "var(--ink)",
                          fontWeight: 700,
                          fontSize: 18,
                          border: "1px solid var(--line)",
                        }}
                      >
                        {die}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, marginTop: 8, opacity: 0.6 }}>
                    Lancer {opponentState.rollNumber}/3
                  </p>
                </>
              ) : (
                <>
                  <div className="spinner" style={{ marginBottom: 16, fontSize: 32 }}>🎲</div>
                  <p style={{ fontWeight: 600 }}>Au tour de ton adversaire...</p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
