import type React from "react";

export interface LayoutProps {
  theme: string;
  isMultiplayerOpen: boolean;
  playerName: string;
  playerNameError: string;
  roomCode: string;
  roomCodeError: string;
  isDemonThemeEnabled: boolean;
  onStartBot: () => void;
  onStartQuiz: () => void;
  onPlayDuo: () => void;
  onStartMultiplayer: () => void;
  onToggleMultiplayer: () => void;
  onCloseMultiplayer?: () => void;
  onJoinMultiplayer: (e: React.FormEvent<HTMLFormElement>) => void;
  onPlayerNameChange: (name: string) => void;
  onPlayerNameBlur: () => void;
  onRoomCodeChange: (code: string) => void;
  onPasteRoomCode: () => void;
  onToggleDemonTheme: (enabled: boolean) => void;
}
