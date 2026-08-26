import Link from "next/link";
import type { GameState } from "@/domain/game";
import { getBotPolicy } from "@/domain/bots";

export function GameHeader({ game }: { game: GameState }) {
  return (
    <header className="game-header">
      <Link className="game-logo" href="/" aria-label="Yazzy, revenir à l’accueil">YAZZY</Link>
      <span className="mode-label">BOT · {getBotPolicy(game.botLevel).label}</span>
      <Link
        className="quit-link"
        href="/"
        onClick={(event) => {
          if (!window.confirm("Quitter la partie en cours ?")) event.preventDefault();
        }}
      >
        Quitter
      </Link>
    </header>
  );
}
