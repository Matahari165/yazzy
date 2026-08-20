import type { MultiplayerRole } from "../domain/multiplayer";
import { isPlayerToken } from "../domain/multiplayerRoomProtocol";
import { isRoomCode } from "../domain/roomCode";
import { normalizePlayerName } from "../domain/playerName";

export const PLAYER_PAIRING_STORAGE_KEY = "yazzy.playerPairing.v1";

export type PlayerPairing = {
  roomId: string;
  role: MultiplayerRole;
  localToken: string;
  guestToken: string | null;
  partnerName: string;
};

function parsePairing(value: unknown): PlayerPairing | null {
  if (!value || typeof value !== "object") return null;
  const pairing = value as Partial<PlayerPairing>;
  const role = pairing.role;
  const guestToken = pairing.guestToken ?? null;

  if (
    !pairing.roomId ||
    !isRoomCode(pairing.roomId) ||
    (role !== "player1" && role !== "player2") ||
    !pairing.localToken ||
    !isPlayerToken(pairing.localToken) ||
    (role === "player1" && !isPlayerToken(guestToken)) ||
    (role === "player2" && guestToken !== null)
  ) {
    return null;
  }

  return {
    roomId: pairing.roomId,
    role,
    localToken: pairing.localToken,
    guestToken,
    partnerName: normalizePlayerName(pairing.partnerName ?? ""),
  };
}

function writePairing(pairing: PlayerPairing): PlayerPairing {
  try {
    window.localStorage.setItem(PLAYER_PAIRING_STORAGE_KEY, JSON.stringify(pairing));
  } catch {}
  return pairing;
}

export function readStoredPlayerPairing(): PlayerPairing | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PLAYER_PAIRING_STORAGE_KEY);
    if (!raw) return null;
    const pairing = parsePairing(JSON.parse(raw));
    if (!pairing) window.localStorage.removeItem(PLAYER_PAIRING_STORAGE_KEY);
    return pairing;
  } catch {
    return null;
  }
}

export function createHostPlayerPairing(roomId: string): PlayerPairing {
  return writePairing({
    roomId,
    role: "player1",
    localToken: crypto.randomUUID(),
    guestToken: crypto.randomUUID(),
    partnerName: "",
  });
}

export function acceptGuestPlayerPairing(roomId: string, guestToken: string): PlayerPairing | null {
  if (!isRoomCode(roomId) || !isPlayerToken(guestToken)) return null;
  return writePairing({
    roomId,
    role: "player2",
    localToken: guestToken,
    guestToken: null,
    partnerName: "",
  });
}

export function updatePlayerPairingPartnerName(name: string): PlayerPairing | null {
  const pairing = readStoredPlayerPairing();
  const partnerName = normalizePlayerName(name);
  if (!pairing || !partnerName || pairing.partnerName === partnerName) return pairing;
  return writePairing({ ...pairing, partnerName });
}

export function removeStoredPlayerPairing(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PLAYER_PAIRING_STORAGE_KEY);
  } catch {}
}
