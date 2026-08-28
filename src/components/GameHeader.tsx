import Link from "next/link";
import { SoundToggle } from "./SoundToggle";

type GameHeaderProps = {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onQuit: () => void;
};

export function GameHeader({ soundEnabled, onToggleSound, onQuit }: GameHeaderProps) {
  return (
    <header className="game-header">
      <Link className="game-logo" href="/" aria-label="Yazzy, revenir à l’accueil">YAZZY</Link>
      <SoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
      <Link
        className="quit-link multiplayer-quit-link"
        href="/"
        aria-label="Quitter la partie"
        onClick={(event) => {
          if (!window.confirm("Quitter la partie en cours ?")) event.preventDefault();
          else onQuit();
        }}
      >
        <span aria-hidden="true">×</span>
      </Link>
    </header>
  );
}
