import Link from "next/link";
import { SoundToggle } from "./SoundToggle";

type GameHeaderProps = {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onQuit: () => void;
  /** Tour du joueur : la tuile se redresse et se soulève (data-active). */
  isActive?: boolean;
  /** Déclenche le bump discret de la tuile (équivalent streak/jackpot du quiz). */
  bumpKey?: number | string | boolean;
};

export function GameHeader({ soundEnabled, onToggleSound, onQuit, isActive = false, bumpKey = false }: GameHeaderProps) {
  const showBump = bumpKey !== false && bumpKey !== 0 && bumpKey !== "";
  return (
    <header className="game-header">
      <Link className="game-logo" href="/" aria-label="Yazzy, revenir à l’accueil">
        <span
          className="game-logo-tile"
          data-active={isActive}
          data-bump={showBump}
          key={typeof bumpKey === "number" || typeof bumpKey === "string" ? bumpKey : undefined}
          aria-hidden="true"
        >Y!</span>
        <span>Yazzy</span>
      </Link>
      <SoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
      <Link
        className="quit-link multiplayer-quit-link"
        href="/"
        aria-label="Quitter la partie"
        onClick={() => onQuit()}
      >
        <span aria-hidden="true">×</span>
      </Link>
    </header>
  );
}
