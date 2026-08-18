import {
  normalizePlayerName,
  PLAYER_NAME_STORAGE_KEY,
} from "../domain/playerName";

const PLAYER_NAME_COOKIE_KEY = "yazzy.playerName";
const PLAYER_NAME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readCookieValue(cookieHeader: string, key: string): string {
  const prefix = `${key}=`;
  const entry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!entry) return "";
  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch {
    return "";
  }
}

function writePlayerNameCookie(name: string) {
  if (typeof document === "undefined") return;
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${PLAYER_NAME_COOKIE_KEY}=${encodeURIComponent(name)}; Max-Age=${PLAYER_NAME_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } catch {}
}

export function readStoredPlayerName(): string {
  if (typeof window === "undefined") return "";

  try {
    const localName = normalizePlayerName(window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "");
    if (localName) {
      writePlayerNameCookie(localName);
      return localName;
    }
  } catch {}

  if (typeof document === "undefined") return "";
  const cookieName = normalizePlayerName(readCookieValue(document.cookie, PLAYER_NAME_COOKIE_KEY));
  if (!cookieName) return "";

  try {
    window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, cookieName);
  } catch {}
  return cookieName;
}

export function writeStoredPlayerName(value: string): string {
  const name = normalizePlayerName(value);
  if (!name || typeof window === "undefined") return name;

  try {
    window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
  } catch {}

  writePlayerNameCookie(name);

  return name;
}
