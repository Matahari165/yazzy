"use client";

import Link from "next/link";
import { useState } from "react";
import { normalizePlayerName, PLAYER_NAME_MAX_LENGTH } from "@/domain/playerName";

export function MultiplayerNameGate({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = normalizePlayerName(name);
    if (!normalizedName) {
      setError("Choisis un pseudo pour rejoindre la partie.");
      return;
    }
    onSave(normalizedName);
  };

  return (
    <main id="main-content" className="multiplayer-state-card name-gate-card">
      <h1>Pseudo</h1>
      <form className="name-gate-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="multiplayer-player-name" className="sr-only">Pseudo</label>
        <input
          id="multiplayer-player-name"
          name="player-name"
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value.slice(0, PLAYER_NAME_MAX_LENGTH));
            setError("");
          }}
          placeholder="Alex"
          autoComplete="nickname"
          maxLength={PLAYER_NAME_MAX_LENGTH}
          aria-describedby={error ? "multiplayer-player-name-error" : undefined}
          aria-invalid={error ? true : undefined}
        />
        {error ? <p id="multiplayer-player-name-error" className="form-error" role="alert">{error}</p> : null}
        <button className="primary-action" type="submit">Rejoindre</button>
      </form>
      <Link className="secondary-action" href="/">Accueil</Link>
    </main>
  );
}
