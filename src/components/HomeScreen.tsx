"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
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
import { botAudio } from "@/lib/botAudio";
import type { DieValue } from "@/domain/yatzy";
import { DieGlyph } from "./Dice";

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

/** Cinq dés qui se relancent tout seuls ; un clic relance ce dé seul. */
function HeroDice() {
  const [round, setRound] = useState(0);
  const [values, setValues] = useState<DieValue[]>([6, 1, 4, 3, 5]);
  const [bumps, setBumps] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setValues(Array.from({ length: 5 }, () => (1 + Math.floor(Math.random() * 6)) as DieValue));
      setRound((n) => n + 1);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  const rerollOne = (index: number) => {
    setValues((prev) => {
      let next: DieValue = (1 + Math.floor(Math.random() * 6)) as DieValue;
      if (prev.length > 1) {
        while (next === prev[index]) {
          next = (1 + Math.floor(Math.random() * 6)) as DieValue;
        }
      }
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
    setBumps((prev) => {
      const copy = [...prev];
      copy[index] += 1;
      return copy;
    });
  };

  return (
    <div className="hero-dice" role="group" aria-label="Cinq dés qui roulent tout seuls, touche un dé pour le relancer">
      {values.map((value, index) => (
        <button
          key={`${round}-${bumps[index]}-${index}`}
          className="hero-die"
          style={{ "--i": index } as CSSProperties}
          type="button"
          onClick={() => rerollOne(index)}
          aria-label={`Relancer le dé ${index + 1}, valeur ${value}`}
        >
          <DieGlyph value={value} className="hero-die-face" />
        </button>
      ))}
    </div>
  );
}

const TITLE = "Yazzy";

const SHAPES = [
  { kind: "ring", depth: 34 },
  { kind: "plus", depth: 22 },
  { kind: "dot", depth: 46 },
  { kind: "trian", depth: 28 },
  { kind: "square", depth: 40 },
  { kind: "dot", depth: 18 },
  { kind: "star", depth: 26 },
  { kind: "zig", depth: 32 },
] as const;

export function HomeScreen() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeError, setRoomCodeError] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerNameError, setPlayerNameError] = useState("");
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [isDemonThemeEnabled, setIsDemonThemeEnabled] = useState(true);
  const shellRef = useRef<HTMLElement>(null);
  const multiplayerRef = useRef<HTMLElement>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    router.prefetch("/game");
    router.prefetch("/quiz");
  }, [router]);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => {
      setPlayerName(readStoredPlayerName());
      setIsDemonThemeEnabled(readBotDemonTheme());
      try {
        window.localStorage.removeItem("yazzy.playerPairing.v1");
      } catch {}
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  // Projecteur + parallaxe suivent le pointeur, sans re-rendu.
  // En reduced-motion : décor fixe, aucune variable de mouvement.
  const followPointer = (event: React.PointerEvent) => {
    if (reduceMotionRef.current) return;
    const el = shellRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--px", (x / rect.width - 0.5).toFixed(3));
    el.style.setProperty("--py", (y / rect.height - 0.5).toFixed(3));
  };

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
    try {
      writeBotDemonTheme(isDemonThemeEnabled);
      writeStoredGame(createGame("expert"));
      botAudio.syncPreference();
      botAudio.startGame(isDemonThemeEnabled);
    } catch (err) {
      console.warn("Erreur lancement bot:", err);
    }
    router.push("/game");
  };

  const startQuiz = () => {
    router.push("/quiz");
  };

  const toggleMultiplayer = () => {
    setIsMultiplayerOpen((prev) => {
      const next = !prev;
      if (next) {
        window.setTimeout(() => {
          multiplayerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          const input = multiplayerRef.current?.querySelector<HTMLInputElement>("input#player-name");
          input?.focus();
        }, 50);
      }
      return next;
    });
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
      ref={shellRef}
      className="lobby-shell"
      data-multiplayer-open={isMultiplayerOpen}
      onPointerMove={followPointer}
    >
      <div className="lobby-bg" aria-hidden="true">
        <span className="lobby-spot" />
        <span className="lobby-grid" />
        <span className="lobby-ghost">Jouer</span>
        <span className="lobby-shapes">
          {SHAPES.map((shape, index) => (
            <span
              key={index}
              className="lobby-shape"
              data-shape={index}
              style={{ "--pd": shape.depth, "--i": index } as CSSProperties}
            >
              <i className={`shape-${shape.kind}`} />
            </span>
          ))}
        </span>
      </div>

      <header className="lobby-hero">
        <h1 id="lobby-title" className="hero-title" aria-label={TITLE}>
          {TITLE.split("").map((letter, index) => (
            <span key={index} aria-hidden="true" style={{ "--i": index } as CSSProperties}>
              {letter}
            </span>
          ))}
        </h1>
        <HeroDice />
      </header>

      <div className="lobby-ticker" aria-hidden="true">
        <div className="lobby-ticker-track">
          {[0, 1].map((copy) => (
            <span key={copy}>
              Lance les dés <b>◆</b> Garde tes figures <b>◆</b> Inscris ton score <b>◆</b> 3
              lancers par tour <b>◆</b> Solo · Duo · Quiz <b>◆</b> Lance les dés <b>◆</b> Garde
              tes figures <b>◆</b> Inscris ton score <b>◆</b> 3 lancers par tour <b>◆</b> Solo ·
              Duo · Quiz <b>◆</b>{" "}
            </span>
          ))}
        </div>
      </div>

      <nav className="game-mode-grid" aria-label="Modes de jeu">
        <button className="game-mode-action game-mode-action-primary st-rise" style={{ "--i": 0 } as CSSProperties} type="button" onClick={startBotGame}>
          <span className="game-mode-stub" aria-hidden="true">Solo</span>
          <ModeDiceIcon />
          <span>
            <strong>Solo</strong>
            <small>Contre un bot</small>
          </span>
          <span className="game-mode-go" aria-hidden="true">→</span>
        </button>
        <button
          className="game-mode-action game-mode-action-duo st-rise"
          style={{ "--i": 1 } as CSSProperties}
          type="button"
          aria-expanded={isMultiplayerOpen}
          aria-controls="multiplayer-options"
          data-active={isMultiplayerOpen}
          onClick={toggleMultiplayer}
        >
          <span className="game-mode-stub" aria-hidden="true">Duo</span>
          <ModeDiceIcon pair />
          <span>
            <strong>Duo</strong>
            <small>Avec un ami</small>
          </span>
          <span className="game-mode-go" aria-hidden="true">{isMultiplayerOpen ? "↓" : "→"}</span>
        </button>
        <button
          className="game-mode-action game-mode-action-quiz st-rise"
          style={{ "--i": 2 } as CSSProperties}
          type="button"
          onClick={startQuiz}
        >
          <span className="mode-quiz-icon" aria-hidden="true">?</span>
          <span>
            <strong>Quiz</strong>
            <small>Culture G</small>
          </span>
          <span className="game-mode-go" aria-hidden="true">→</span>
        </button>
      </nav>

      {isMultiplayerOpen ? (
        <section
          id="multiplayer-options"
          ref={multiplayerRef}
          className="multiplayer-options"
          aria-label="Partie avec un ami"
        >
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

      <div className="lobby-foot">
        <label className="demon-theme-toggle">
          <span className="demon-stub" aria-hidden="true">Boss</span>
          <input
            type="checkbox"
            checked={isDemonThemeEnabled}
            onChange={(event) => {
              const enabled = event.currentTarget.checked;
              setIsDemonThemeEnabled(enabled);
              writeBotDemonTheme(enabled);
            }}
          />
          <span>
            <strong>Mode démon</strong>
            <small>Ambiance du boss en Solo</small>
          </span>
        </label>
      </div>
    </main>
  );
}
