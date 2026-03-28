import "server-only";

function requireUrlEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} が設定されていません。`);
  }

  return value;
}

export function buildGuestRoomUrl(roomId: string) {
  const baseUrl = requireUrlEnv("GUEST_ROOM_URL_BASE");
  const url = new URL(baseUrl);
  url.searchParams.set("room_id", roomId);
  return url.toString();
}

export function buildHearingSheetUrl(token: string, baseUrlOverride?: string) {
  const baseUrl = baseUrlOverride || process.env.HOTEL_HEARING_SHEET_URL_BASE?.trim() || "";

  if (!baseUrl) {
    throw new Error("HOTEL_HEARING_SHEET_URL_BASE が設定されていません。");
  }

  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
