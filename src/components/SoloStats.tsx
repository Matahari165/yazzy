"use client";

import { useEffect, useRef, useState } from "react";
import { exportSoloResults, getDeviceId, importSoloResults, readSoloResults, summarizeSoloResults, type SoloResult } from "@/lib/soloStats";

export function SoloStats() {
  const [results, setResults] = useState<SoloResult[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setResults(readSoloResults());
    setDeviceId(getDeviceId());
  };

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener("storage", refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener("storage", refresh); };
  }, []);

  const local = summarizeSoloResults(results.filter((row) => row.deviceId === deviceId));
  const combined = summarizeSoloResults(results);
  const rate = (wins: number, games: number) => games ? `${Math.round(wins / games * 100)} %` : "—";

  const exportResults = () => {
    const blob = new Blob([exportSoloResults()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yazzy-parties-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setMessage("Historique téléchargé.");
  };

  const importResults = async (file: File | undefined) => {
    if (!file) return;
    try {
      const count = importSoloResults(await file.text());
      refresh();
      setMessage(count ? `${count} partie${count > 1 ? "s" : ""} ajoutée${count > 1 ? "s" : ""}.` : "Toutes ces parties sont déjà enregistrées.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import impossible.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <section className="solo-stats" aria-label="Résultats des parties solo">
      <div className="solo-stats-totals">
        <p><strong>Cet appareil</strong> · {local.games} partie{local.games > 1 ? "s" : ""} · {local.wins} victoire{local.wins > 1 ? "s" : ""} · {rate(local.wins, local.games)}</p>
        <p><strong>Avec les imports</strong> · {combined.games} partie{combined.games > 1 ? "s" : ""} · {combined.wins} victoire{combined.wins > 1 ? "s" : ""} · {rate(combined.wins, combined.games)}</p>
      </div>
      <p className="solo-stats-detail">{combined.losses} défaite{combined.losses > 1 ? "s" : ""} · {combined.ties} égalité{combined.ties > 1 ? "s" : ""}</p>
      <div className="solo-stats-actions">
        <button type="button" onClick={exportResults}>Exporter JSON</button>
        <button type="button" onClick={() => inputRef.current?.click()}>Importer JSON</button>
        <input ref={inputRef} type="file" accept=".json,application/json" aria-label="Fichier de parties Yazzy" onChange={(event) => void importResults(event.target.files?.[0])} hidden />
      </div>
      <p className="solo-stats-help">Pour réunir vos parties, exporte le fichier d’un appareil puis importe-le sur l’autre.</p>
      {message ? <p className="solo-stats-message" role="status">{message}</p> : null}
    </section>
  );
}
