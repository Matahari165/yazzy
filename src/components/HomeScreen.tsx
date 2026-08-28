"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  generateRoomCode,
  isRoomCode,
  normalizeRoomCode,
} from "@/domain/roomCode";
import {
  normalizePlayerName,
  PLAYER_NAME_MAX_LENGTH,
} from "@/domain/playerName";
import {
  readStoredPlayerName,
  writeStoredPlayerName,
} from "@/lib/playerNameStorage";
import { createGame } from "@/domain/game";
import { writeStoredGame } from "@/lib/gameStorage";
import { readBotDemonTheme, writeBotDemonTheme } from "@/lib/botThemeStorage";

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
        <rect x="7" y={pair ? "15" : "9"} width="32" height="32" rx="9" />
        <circle cx="17" cy={pair ? "25" : "19"} r="2.7" />
        <circle cx="29" cy={pair ? "37" : "31"} r="2.7" />
      </g>
    </svg>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeError, setRoomCodeError] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerNameError, setPlayerNameError] = useState("");
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [isDemonThemeEnabled, setIsDemonThemeEnabled] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPlayerName(readStoredPlayerName());
      setIsDemonThemeEnabled(readBotDemonTheme());
      try {
        window.localStorage.removeItem("yazzy.playerPairing.v1");
      } catch {}
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

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

  const startBotGame = () => {
    writeBotDemonTheme(isDemonThemeEnabled);
    writeStoredGame(createGame("expert"));
    router.push("/game");
  };

  const joinRoom = (code: string, invalidMessage = "Saisis les 6 caractères du code envoyé par ton ami.") => {
    const normalizedCode = normalizeRoomCode(code);
    if (!isRoomCode(normalizedCode)) {
      setRoomCodeError(invalidMessage);
      return;
    }

    if (!savePlayerName()) return;

    setRoomCodeError("");
    router.push(`/play/${normalizedCode}`);
  };

  const joinMultiplayer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    joinRoom(roomCode);
  };

  const joinPastedRoomCode = (pastedValue: string) => {
    const normalizedCode = normalizeRoomCode(pastedValue);
    setRoomCode(normalizedCode);
    joinRoom(normalizedCode, "Le code collé n’est pas un code de partie valide.");
  };

  const pasteRoomCodeFromField = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    setRoomCodeError("");
    joinPastedRoomCode(event.clipboardData.getData("text"));
  };

  const pasteRoomCode = async () => {
    setRoomCodeError("");
    try {
      if (!navigator.clipboard?.readText) throw new Error("Clipboard unavailable");
      joinPastedRoomCode(await navigator.clipboard.readText());
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
          <section className="new-game" aria-label="Modes de jeu">
            <div className="game-mode-grid">
              <button className="game-mode-action game-mode-action-primary" type="button" onClick={startBotGame}>
                <ModeDiceIcon />
                <span>
                  <strong>Solo</strong>
                  <small>Contre un bot</small>
                </span>
              </button>
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
                  <strong>Duo</strong>
                  <small>Avec un ami</small>
                </span>
              </button>
            </div>
            <label className="demon-theme-toggle">
              <input
                type="checkbox"
                checked={isDemonThemeEnabled}
                onChange={(event) => {
                  const enabled = event.currentTarget.checked;
                  setIsDemonThemeEnabled(enabled);
                  writeBotDemonTheme(enabled);
                }}
              />
              <span aria-hidden="true">😈</span>
              <span>
                <strong>Mode démon</strong>
                <small>Ambiance du boss en Solo</small>
              </span>
            </label>
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
                      onPaste={pasteRoomCodeFromField}
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
