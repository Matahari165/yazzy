const configuredHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST?.trim();

export const PARTYKIT_HOST = configuredHost || "localhost:1999";
export const IS_MULTIPLAYER_AVAILABLE =
  process.env.NODE_ENV !== "production" || Boolean(configuredHost);
export const MULTIPLAYER_UNAVAILABLE_MESSAGE =
  "Le serveur des parties privées n’est pas encore configuré sur cette version de Yazzy.";
