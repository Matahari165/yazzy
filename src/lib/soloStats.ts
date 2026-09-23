import type { GameState } from "../domain/game";
import { isFinished } from "../domain/game";
import { totalScore } from "../domain/yatzy";

export const SOLO_STATS_KEY = "yazzy.soloResults.v1";
const DEVICE_KEY = "yazzy.soloDevice.v1";
const MAX_IMPORT_BYTES = 2_000_000;
const MAX_RESULTS = 20_000;

export type SoloResult = {
  id: string;
  deviceId: string;
  finishedAt: string;
  humanScore: number;
  botScore: number;
  outcome: "win" | "loss" | "tie";
};

function validResult(value: unknown): value is SoloResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Partial<SoloResult>;
  return typeof row.id === "string" && row.id.length > 0 && row.id.length <= 100 &&
    typeof row.deviceId === "string" && row.deviceId.length > 0 && row.deviceId.length <= 100 &&
    typeof row.finishedAt === "string" && !Number.isNaN(Date.parse(row.finishedAt)) &&
    Number.isInteger(row.humanScore) && Number(row.humanScore) >= 0 && Number(row.humanScore) <= 500 &&
    Number.isInteger(row.botScore) && Number(row.botScore) >= 0 && Number(row.botScore) <= 500 &&
    row.outcome === (row.humanScore === row.botScore ? "tie" : Number(row.humanScore) > Number(row.botScore) ? "win" : "loss");
}

function parseResults(raw: string | null): SoloResult[] {
  if (!raw || raw.length > MAX_IMPORT_BYTES) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const envelope = parsed as { version?: unknown; results?: unknown };
    if (envelope.version !== 1 || !Array.isArray(envelope.results) || envelope.results.length > MAX_RESULTS) return [];
    if (!envelope.results.every(validResult)) return [];
    return dedupe(envelope.results);
  } catch {
    return [];
  }
}

function dedupe(results: SoloResult[]): SoloResult[] {
  const byId = new Map<string, SoloResult>();
  for (const result of results) if (!byId.has(result.id)) byId.set(result.id, result);
  return [...byId.values()];
}

function legacyId(game: GameState, deviceId: string): string {
  const scores = JSON.stringify([game.human.scores, game.bot.scores]);
  let hash = 2166136261;
  for (let index = 0; index < scores.length; index += 1) {
    hash = Math.imul(hash ^ scores.charCodeAt(index), 16777619);
  }
  return `legacy-${deviceId}-${(hash >>> 0).toString(16)}`;
}

function storage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

export function getDeviceId(): string | null {
  const store = storage();
  if (!store) return null;
  try {
    const existing = store.getItem(DEVICE_KEY);
    if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return existing;
    const id = crypto.randomUUID();
    store.setItem(DEVICE_KEY, id);
    return id;
  } catch { return null; }
}

export function readSoloResults(): SoloResult[] {
  try { return parseResults(storage()?.getItem(SOLO_STATS_KEY) ?? null); } catch { return []; }
}

function save(results: SoloResult[]): boolean {
  try {
    storage()?.setItem(SOLO_STATS_KEY, JSON.stringify({ version: 1, results }));
    return storage() !== null;
  } catch { return false; }
}

export function recordSoloResult(game: GameState): boolean {
  if (!isFinished(game)) return false;
  const deviceId = getDeviceId();
  if (!deviceId) return false;
  const humanScore = totalScore(game.human.scores);
  const botScore = totalScore(game.bot.scores);
  // Une sauvegarde d'avant les identifiants conserve une clé stable lors du rechargement.
  const id = game.gameId ?? legacyId(game, deviceId);
  const current = readSoloResults();
  if (current.some((row) => row.id === id)) return true;
  if (current.length >= MAX_RESULTS) return false;
  return save([...current, {
    id, deviceId, finishedAt: new Date().toISOString(), humanScore, botScore,
    outcome: humanScore === botScore ? "tie" : humanScore > botScore ? "win" : "loss",
  }]);
}

export function exportSoloResults(): string {
  return JSON.stringify({ version: 1, results: readSoloResults() }, null, 2);
}

export function importSoloResults(raw: string): number {
  if (raw.length > MAX_IMPORT_BYTES) throw new Error("Fichier trop volumineux.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Fichier JSON illisible."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
    (parsed as { version?: unknown }).version !== 1 ||
    !Array.isArray((parsed as { results?: unknown }).results) ||
    !(parsed as { results: unknown[] }).results.every(validResult)) {
    throw new Error("Ce fichier ne contient pas un historique Yazzy valide.");
  }
  const incoming = (parsed as { results: SoloResult[] }).results;
  if (incoming.length > MAX_RESULTS) throw new Error("Trop de parties dans ce fichier.");
  const current = readSoloResults();
  const known = new Set(current.map((row) => row.id));
  const added = dedupe(incoming).filter((row) => !known.has(row.id));
  if (current.length + added.length > MAX_RESULTS) throw new Error("Historique trop volumineux.");
  if (added.length && !save([...current, ...added])) throw new Error("Impossible d’enregistrer les parties sur cet appareil.");
  return added.length;
}

export function summarizeSoloResults(results: SoloResult[]) {
  return {
    games: results.length,
    wins: results.filter((row) => row.outcome === "win").length,
    losses: results.filter((row) => row.outcome === "loss").length,
    ties: results.filter((row) => row.outcome === "tie").length,
  };
}
