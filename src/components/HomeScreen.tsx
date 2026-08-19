"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isFinished, type GameState } from "@/domain/game";
import {
  generateRoomCode,
  isRoomCode,
  normalizeRoomCode,
} from "@/domain/roomCode";
import { CATEGORY_IDS } from "@/domain/yatzy";
import {
  normalizePlayerName,
  PLAYER_NAME_MAX_LENGTH,
} from "@/domain/playerName";
import { readStoredGame } from "@/lib/gameStorage";
import {
  readStoredPlayerName,
  writeStoredPlayerName,
} from "@/lib/playerNameStorage";

function ModeDiceIcon({ pair = false }: { pair?: boolean }) {
  return (
    <svg
      className="mode-dice-icon"
      viewBox="0 0 64 48"
      aria-hidden="true"
    >
      {pair ? (
        <g className="mode-die-back">
          <rect x="27" y="3" width="30" height="30" rx="8" />
          <circle cx="36" cy="12" r="2.5" />
          <circle cx="48" cy="24" r="2.5" />
        </g>
      ) : null}
      <g className="mode-die-front">
        <rect x={pair ? "7" : "17"} y={pair ? "15" : "9"} width="32" height="32" rx="9" />
        <circle cx={pair ? "17" : "27"} cy={pair ? "25" : "19"} r="2.7" />
        <circle cx={pair ? "29" : "39"} cy={pair ? "37" : "31"} r="2.7" />
      </g>
    </svg>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeError, setRoomCodeError] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerNameError, setPlayerNameError] = useState("");
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSavedGame(readStoredGame());
      setPlayerName(readStoredPlayerName());
      setHasLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const canResume = hasLoaded && savedGame !== null && !isFinished(savedGame);
  const savedTurn = savedGame
    ? Math.min(savedGame.turn, CATEGORY_IDS.length)
    : 0;

  const savePlayerName = () => {
    const normalizedName = normalizePlayerName(playerName);
    if (!normalizedName) {
      setPlayerNameError("Choisis un pseudo pour la partie.");
      return null;
    }
    writeStoredPlayerName(normalizedName);
    setPlayerName(normalizedName);
    setPlayerNameError("");
    return normalizedName;
  };

  const startMultiplayer = () => {
    if (!savePlayerName()) return;
    router.push(`/play/${generateRoomCode()}?host=1`);
  };

  const joinMultiplayer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = normalizeRoomCode(roomCode);

    if (!isRoomCode(normalizedCode)) {
      setRoomCodeError("Saisis les 6 caractères du code envoyé par ton ami.");
      return;
    }

    if (!savePlayerName()) return;

    setRoomCodeError("");
    router.push(`/play/${normalizedCode}`);
  };

  const pasteRoomCode = async () => {
    setRoomCodeError("");
    try {
      if (!navigator.clipboard?.readText) throw new Error("Clipboard unavailable");
      const normalizedCode = normalizeRoomCode(await navigator.clipboard.readText());
      setRoomCode(normalizedCode);

      if (!isRoomCode(normalizedCode)) {
        setRoomCodeError("Le presse-papiers ne contient pas un code de partie valide.");
        return;
      }

      if (!savePlayerName()) return;
      router.push(`/play/${normalizedCode}`);
    } catch {
      setRoomCodeError("Impossible de lire le presse-papiers. Colle le code dans le champ.");
    }
  };

  return (
    <main
      id="main-content"
      className="lobby-shell"
      data-multiplayer-open={isMultiplayerOpen}
    >
      <section className="lobby-card" aria-labelledby="lobby-title">
        <header className="lobby-brand">
          <span className="logo-mark" aria-hidden="true"><span /><span /><span /></span>
          <h1 id="lobby-title">Yazzy</h1>
        </header>

        <div className="lobby-actions">
          {canResume ? (
            <Link className="resume-action" href="/game">
              <strong>Reprendre</strong>
              <progress
                max={CATEGORY_IDS.length}
                value={savedTurn}
                aria-label={`Tour ${savedTurn} sur ${CATEGORY_IDS.length}`}
              />
              <span>{savedTurn} / {CATEGORY_IDS.length}</span>
            </Link>
          ) : null}

          <section className="new-game" aria-labelledby="new-game-title">
            <h2 id="new-game-title">Nouvelle partie</h2>
            <div className="game-mode-grid">
              <Link className="game-mode-action game-mode-action-primary" href="/bot">
                <ModeDiceIcon />
                <span>
                  <strong>Solo</strong>
                  <small>Contre un bot</small>
                </span>
              </Link>
              <button
                className="game-mode-action"
                type="button"
                aria-expanded={isMultiplayerOpen}
                aria-controls="multiplayer-options"
                data-active={isMultiplayerOpen}
                onClick={() => setIsMultiplayerOpen((isOpen) => !isOpen)}
              >
                <ModeDiceIcon pair />
                <span>
                  <strong>À deux</strong>
                  <small>Avec un ami</small>
                </span>
              </button>
            </div>
          </section>

          {isMultiplayerOpen ? (
            <section id="multiplayer-options" className="multiplayer-options" aria-label="Partie avec un ami">
              <div className="player-name-field">
                <label htmlFor="player-name">Pseudo</label>
                <input
                  id="player-name"
                  name="player-name"
                  type="text"
                  value={playerName}
                  onChange={(event) => {
                    setPlayerName(event.currentTarget.value.slice(0, PLAYER_NAME_MAX_LENGTH));
                    setPlayerNameError("");
                  }}
                  onBlur={() => {
                    const normalizedName = normalizePlayerName(playerName);
                    setPlayerName(normalizedName);
                    if (normalizedName) writeStoredPlayerName(normalizedName);
                  }}
                  placeholder="Alex"
                  autoComplete="nickname"
                  spellCheck={false}
                  maxLength={PLAYER_NAME_MAX_LENGTH}
                  aria-describedby={playerNameError ? "player-name-error" : undefined}
                  aria-invalid={playerNameError ? true : undefined}
                />
                {playerNameError ? (
                  <p id="player-name-error" className="form-error" role="alert">{playerNameError}</p>
                ) : null}
              </div>

              <button className="primary-action create-room-action" type="button" onClick={startMultiplayer}>
                Créer une partie
              </button>

              <div className="lobby-divider" aria-hidden="true"><span>ou</span></div>

              <form className="lobby-code-form" onSubmit={joinMultiplayer} noValidate>
                <label className="sr-only" htmlFor="room-code">Code de partie</label>
                <div className="lobby-code-controls">
                  <div className="room-code-field">
                    <input
                      id="room-code"
                      name="room-code"
                      type="text"
                      value={roomCode}
                      onChange={(event) => {
                        setRoomCode(normalizeRoomCode(event.currentTarget.value));
                        setRoomCodeError("");
                      }}
                      placeholder="ABC123"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      inputMode="text"
                      maxLength={6}
                      aria-describedby={roomCodeError ? "room-code-error" : undefined}
                      aria-invalid={roomCodeError ? true : undefined}
                    />
                    <button className="paste-code-action" type="button" onClick={pasteRoomCode}>
                      Coller
                    </button>
                  </div>
                  <button className="secondary-action join-room-action" type="submit">
                    Rejoindre
                  </button>
                </div>
                {roomCodeError ? (
                  <p id="room-code-error" className="form-error" role="alert">{roomCodeError}</p>
                ) : null}
              </form>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
