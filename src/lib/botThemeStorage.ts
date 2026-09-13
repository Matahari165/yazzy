const BOT_DEMON_THEME_STORAGE_KEY = "yazzy.botDemonTheme.v1";

export function readBotDemonTheme(): boolean {
  try {
    return window.localStorage.getItem(BOT_DEMON_THEME_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeBotDemonTheme(enabled: boolean): void {
  try {
    window.localStorage.setItem(BOT_DEMON_THEME_STORAGE_KEY, String(enabled));
  } catch {}
}
