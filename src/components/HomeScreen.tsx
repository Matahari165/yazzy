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
import { readStoredPlayerName, writeStoredPlayerName } from "@/lib/playerNameStorage";
import { readPermanentRoomCode } from "@/lib/permanentRoomStorage";
import { createGame } from "@/domain/game";
import { writeStoredGame } from "@/lib/gameStorage";
import { readBotDemonTheme, writeBotDemonTheme } from "@/lib/botThemeStorage";
import { botAudio } from "@/lib/botAudio";
import { ThemeSwitcher, type UITheme, getSavedTheme } from "./ThemeSwitcher";
import {
  ArenaLayout,
  EditorialLayout,
  PebbleLayout,
  PocketLayout,
  CloudLayout,
  type LayoutProps,
} from "./layouts";

function renderLayout(theme: UITheme, props: LayoutProps) {
  switch (theme) {
    case "craft":
      return <ArenaLayout {...props} />;
    case "riviera":
      return <EditorialLayout {...props} />;
    case "ceramic":
      return <PebbleLayout {...props} />;
    case "botanic":
      return <PocketLayout {...props} />;
    case "pastel":
      return <CloudLayout {...props} />;
    default:
      return <ArenaLayout {...props} />;
  }
}

export function HomeScreen() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [roomCodeError, setRoomCodeError] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerNameError, setPlayerNameError] = useState("");
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [isDemonThemeEnabled, setIsDemonThemeEnabled] = useState(false);
  const [theme, setTheme] = useState<UITheme>("ceramic");
  const shellRef = useRef<HTMLElement>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    router.prefetch("/game");
    router.prefetch("/quiz");
    try {
      const code = readPermanentRoomCode();
      router.prefetch(`/play/${code}`);
    } catch {}
  }, [router]);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => {
      const initialTheme = getSavedTheme();
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
      setPlayerName(readStoredPlayerName());
      setIsDemonThemeEnabled(readBotDemonTheme());
      try {
        window.localStorage.removeItem("yazzy.playerPairing.v1");
      } catch {}
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const handleSelectTheme = (nextTheme: UITheme) => {
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

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
      setPlayerNameError("Pseudo requis.");
      return null;
    }
    writeStoredPlayerName(normalizedName);
    setPlayerName(normalizedName);
    setPlayerNameError("");
    return normalizedName;
  };

  const playDuo = () => {
    if (!savePlayerName()) return;
    const code = readPermanentRoomCode();
    router.push(`/play/${code}`);
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
    setIsMultiplayerOpen((prev) => !prev);
  };

  const closeMultiplayer = () => {
    setIsMultiplayerOpen(false);
  };

  const joinRoom = (code: string, invalidMessage = "6 caractères requis.") => {
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

  const setPastedRoomCode = (pastedValue: string) => {
    const normalizedCode = normalizeRoomCode(pastedValue);
    setRoomCode(normalizedCode);
    setRoomCodeError("");
  };

  const pasteRoomCode = async () => {
    setRoomCodeError("");
    try {
      if (!navigator.clipboard?.readText) throw new Error("Clipboard unavailable");
      setPastedRoomCode(await navigator.clipboard.readText());
    } catch {
      setRoomCodeError("Colle le code dans le champ.");
    }
  };

  const layoutProps: LayoutProps = {
    theme,
    isMultiplayerOpen,
    playerName,
    playerNameError,
    roomCode,
    roomCodeError,
    isDemonThemeEnabled,
    onStartBot: startBotGame,
    onStartQuiz: startQuiz,
    onPlayDuo: playDuo,
    onStartMultiplayer: startMultiplayer,
    onToggleMultiplayer: toggleMultiplayer,
    onCloseMultiplayer: closeMultiplayer,
    onJoinMultiplayer: joinMultiplayer,
    onPlayerNameChange: (name) => {
      setPlayerName(name);
      setPlayerNameError("");
    },
    onPlayerNameBlur: () => {
      const normalizedName = normalizePlayerName(playerName);
      setPlayerName(normalizedName);
      if (normalizedName) writeStoredPlayerName(normalizedName);
    },
    onRoomCodeChange: (code) => {
      setRoomCode(code);
      setRoomCodeError("");
    },
    onPasteRoomCode: pasteRoomCode,
    onToggleDemonTheme: (enabled) => {
      setIsDemonThemeEnabled(enabled);
      writeBotDemonTheme(enabled);
    },
  };

  return (
    <main
      id="main-content"
      ref={shellRef}
      className="lobby-shell"
      data-theme={theme}
      data-multiplayer-open={isMultiplayerOpen}
      onPointerMove={followPointer}
    >
      <ThemeSwitcher currentTheme={theme} onSelectTheme={handleSelectTheme} />
      {renderLayout(theme, layoutProps)}
    </main>
  );
}
