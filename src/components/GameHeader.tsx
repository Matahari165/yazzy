import Link from "next/link";

export function GameHeader() {
  return (
    <header className="game-header">
      <Link className="game-logo" href="/" aria-label="Yazzy, revenir à l’accueil">YAZZY</Link>
      <Link
        className="quit-link multiplayer-quit-link"
        href="/"
        aria-label="Quitter la partie"
        onClick={(event) => {
          if (!window.confirm("Quitter la partie en cours ?")) event.preventDefault();
        }}
      >
        <span aria-hidden="true">×</span>
      </Link>
    </header>
  );
}
