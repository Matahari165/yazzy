export const ROOM_CODE_LENGTH = 6;

const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const ROOM_CODE_PATTERN = /^[2-9A-HJ-NP-Z]{6}$/;

export function normalizeRoomCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
}

export function isRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(value);
}

export function generateRoomCode(
  getRandomValues: (values: Uint8Array) => Uint8Array = (values) =>
    crypto.getRandomValues(values),
): string {
  const values = getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));

  return Array.from(values, (value) => ROOM_CODE_ALPHABET[value & 31]).join("");
}
