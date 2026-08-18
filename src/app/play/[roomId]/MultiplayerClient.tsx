"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FinishedGame } from "@/components/FinishedGame";
import { GameTable } from "@/components/GameTable";
import { MultiplayerNameGate } from "@/components/MultiplayerNameGate";
import { MultiplayerReactions } from "@/components/MultiplayerReactions";
import { ScoreCard } from "@/components/ScoreCard";
import { normalizePlayerName, PLAYER_NAME_STORAGE_KEY } from "@/domain/playerName";
import type { CategoryId } from "@/domain/yatzy";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";

export function MultiplayerClient({ roomId, isHost }: { roomId: string; isHost: boolean }) {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const {
    game,
    localRole,
    opponentOnline,
    isConnected,
    connectionError,
    status,
    roll,
    toggleHeld,
    score,
    rematch,
    reconnect,
    isMyTurn,
    localPlayer,
    opponentPlayer,
    latestReaction,
    sendReaction,
  } = useMultiplayerGame(roomId, isHost, playerName);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const rollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPlayerName(normalizePlayerName(localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? ""));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const localState = localPlayer?.state;
  const opponentState = opponentPlayer?.state;
  const canAct = Boolean(isMyTurn && isConnected && opponentOnline);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setInviteLink(`${window.location.origin}/play/${roomId}`);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [roomId]);

  useEffect(() => () => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
  }, []);

  const handleRoll = () => {
    if (!canAct || isRolling || !localState || localState.rollNumber >= 3) return;
    if (localState.rollNumber > 0 && localState.held.every(Boolean)) return;
    roll();
    setIsRolling(true);
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 260;
    rollTimerRef.current = window.setTimeout(() => {
      rollTimerRef.current = null;
      setIsRolling(false);
    }, duration);
  };

  const handleScore = () => {
    if (!selectedCategory || !canAct || isRolling) return;
    score(selectedCategory);
    setSelectedCategory(null);
  };

  useGameKeyboard({
    disabled: status !== "playing" || !canAct || isRolling,
    canRoll: Boolean(localState && localState.rollNumber < 3 && !localState.held.every(Boolean)),
    canScore: selectedCategory !== null && !isRolling,
    onRoll: handleRoll,
    onScore: handleScore,
    onToggleDie: toggleHeld,
  });

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyStatus("Lien copié");
    } catch {
      setCopyStatus("Sélectionne le lien puis copie-le");
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopyStatus("Code copié");
    } catch {
      setCopyStatus("Copie manuellement le code affiché");
    }
  };

  const handlePlayerName = (name: string) => {
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
    setPlayerName(name);
  };

  if (playerName === null) {
    return <main id="main-content" className="app-loading" aria-busy="true"><p>Préparation de la partie…</p></main>;
  }

  if (!playerName) {
    return <MultiplayerNameGate onSave={handlePlayerName} />;
  }

  if (connectionError && !game) {
    return (
      <main id="main-content" className="multiplayer-state-card" role="alert">
        <p className="eyebrow">CONNEXION IMPOSSIBLE</p>
        <h1>Le salon ne répond pas</h1>
        <p>{connectionError}</p>
        <div className="multiplayer-state-actions">
          <button className="primary-action" type="button" onClick={reconnect}>Réessayer</button>
          <Link className="secondary-action" href="/">Retour à l’accueil</Link>
        </div>
      </main>
    );
  }

  if (status === "connecting") {
    return (
      <main id="main-content" className="app-loading" aria-busy="true">
        <p role="status">Connexion à la partie {roomId}…</p>
      </main>
    );
  }

  if (status === "room_full") {
    return (
      <main id="main-content" className="multiplayer-state-card">
        <p className="eyebrow">SALON COMPLET</p>
        <h1>Deux amis jouent déjà ici</h1>
        <p>Crée une nouvelle partie privée depuis l’accueil.</p>
        <Link className="primary-action" href="/">Retour à l’accueil</Link>
      </main>
    );
  }

  if (status === "waiting") {
    return (
      <main id="main-content" className="game-shell">
        <header className="game-header waiting-header">
          <Link className="game-logo" href="/">YAZZY</Link>
          <span className="mode-label">{playerName}</span>
          <Link className="quit-link" href="/">Quitter</Link>
        </header>

        <section className="waiting-room" aria-labelledby="waiting-title">
          <span className="waiting-dice" aria-hidden="true">•••</span>
          <p className="eyebrow">PARTIE PRIVÉE</p>
          <h1 id="waiting-title">Invite ton ami</h1>
          <p>Envoie-lui ce code. La partie commencera automatiquement dès qu’il l’aura saisi.</p>
          <div className="room-code-block">
            <span>Code de la partie</span>
            <strong>{roomId}</strong>
          </div>
          <div className="invite-actions">
            <button className="primary-action" type="button" onClick={handleCopyCode}>Copier le code</button>
            <button className="secondary-action" type="button" onClick={handleCopyLink}>Copier le lien</button>
          </div>
          <div className="invite-field">
            <label htmlFor="invite-link">Lien privé à partager</label>
            <input id="invite-link" type="text" readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} />
          </div>
          {copyStatus ? <p className="copy-status" role="status">{copyStatus}</p> : null}
          {connectionError ? (
            <div className="multiplayer-state-actions" role="alert">
              <p>{connectionError}</p>
              <button className="secondary-action" type="button" onClick={reconnect}>Réessayer</button>
            </div>
          ) : (
            <p className="waiting-status" role="status"><i aria-hidden="true" /> En attente de ton ami…</p>
          )}
        </section>
      </main>
    );
  }

  if (!game || !localState || !opponentState || !localRole) {
    return <main id="main-content" className="app-loading" aria-busy="true"><p>Chargement de la partie…</p></main>;
  }

  const rematchRequested = game.rematchReady.includes(localRole);
  const localName = localPlayer.name;
  const opponentName = opponentPlayer.name;
  const connectionNotice = !isConnected
    ? "Ta connexion est interrompue. Reconnexion en cours…"
    : !opponentOnline
      ? `${opponentName} est déconnecté·e. La partie reprendra à son retour.`
      : null;

  return (
    <main id="main-content" className="game-shell">
      <header className="game-header multiplayer-game-header">
        <Link className="game-logo" href="/">YAZZY</Link>
        <div className="match-score" aria-label={isMyTurn ? `À ${localName} de jouer` : `À ${opponentName} de jouer`}>
          <span className="match-player" data-active={isMyTurn}>
            <i className="turn-dot" aria-hidden="true" /> {localName}
          </span>
          <span className="score-separator" aria-hidden="true">·</span>
          <span className="match-player" data-active={!isMyTurn} data-online={opponentOnline}>
            <i className="turn-dot" aria-hidden="true" /> {opponentName}
          </span>
        </div>
        <MultiplayerReactions
          disabled={!isConnected || !opponentOnline}
          latestReaction={latestReaction}
          localRole={localRole}
          localName={localName}
          opponentName={opponentName}
          onSend={sendReaction}
        />
        <Link className="quit-link multiplayer-quit-link" href="/" aria-label="Quitter la partie"><span aria-hidden="true">×</span></Link>
      </header>

      {connectionNotice ? <p className="connection-notice" role="status">{connectionNotice}</p> : null}

      {status === "finished" ? (
        <FinishedGame
          game={game}
          localRole={localRole}
          onRematch={rematch}
          rematchRequested={rematchRequested}
          localName={localName}
          opponentName={opponentName}
        />
      ) : (
        <div className="game-content">
          <ScoreCard
            label={`Feuille de score : ${localName} et ${opponentName}`}
            playerLabel={localName}
            opponentLabel={opponentName}
            humanScores={localState.scores}
            botScores={opponentState.scores}
            dice={localState.dice}
            opponentDice={opponentState.dice}
            selected={canAct ? selectedCategory : null}
            canSelect={canAct && localState.rollNumber > 0 && !isRolling}
            isReadOnly={!canAct}
            activeColumn={isMyTurn ? "player" : "opponent"}
            onSelect={setSelectedCategory}
            onScore={handleScore}
          />

          <GameTable
            dice={isMyTurn ? localState.dice : opponentState.dice}
            held={isMyTurn ? localState.held : opponentState.held}
            rollNumber={isMyTurn ? localState.rollNumber : opponentState.rollNumber}
            selectedCategory={isMyTurn ? selectedCategory : null}
            isRolling={isMyTurn ? isRolling : false}
            isDisabled={!canAct}
            isObserver={!isMyTurn}
            label={isMyTurn ? `Les dés de ${localName}` : `Les dés de ${opponentName}`}
            onToggleDie={toggleHeld}
            onRoll={handleRoll}
          />
        </div>
      )}
    </main>
  );
}
