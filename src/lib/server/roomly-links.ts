import "server-only";

import crypto from "node:crypto";

function requireUrlEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} が設定されていません。`);
  }

  return value;
}

export type SignedRoomTokenPayload = {
  v: 1;
  hotel_id: string;
  room_id: string;
  room_number: string;
  iat: number;
  exp: number;
};

type GuestRoomLinkInput = {
  hotel_id: string;
  room_id: string;
  room_number: string;
};

const ROOM_QR_TOKEN_VERSION = 1;
const DEFAULT_ROOM_QR_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;
const ROOMLY_GUEST_ROOM_PUBLIC_URL_BASE = "https://www.roomly.chat/";

function encodeBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function getRoomQrSigningSecret() {
  return requireUrlEnv("ROOM_QR_SIGNING_SECRET");
}

function signRoomTokenPayload(encodedPayload: string) {
  return encodeBase64Url(
    crypto.createHmac("sha256", getRoomQrSigningSecret()).update(encodedPayload).digest(),
  );
}

function getRoomQrTokenTtlSeconds() {
  const raw = process.env.ROOM_QR_TOKEN_TTL_SECONDS?.trim();

  if (!raw) {
    return DEFAULT_ROOM_QR_TOKEN_TTL_SECONDS;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("ROOM_QR_TOKEN_TTL_SECONDS は正の整数で指定してください。");
  }

  return parsed;
}

export function createSignedRoomToken(input: GuestRoomLinkInput) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    v: ROOM_QR_TOKEN_VERSION,
    hotel_id: input.hotel_id,
    room_id: input.room_id,
    room_number: input.room_number,
    iat: issuedAt,
    exp: issuedAt + getRoomQrTokenTtlSeconds(),
  } satisfies SignedRoomTokenPayload;

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signRoomTokenPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySignedRoomToken(token: string) {
  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    throw new Error("room token の形式が不正です。");
  }

  const expectedSignature = signRoomTokenPayload(encodedPayload);
  const providedSignature = decodeBase64Url(encodedSignature);
  const expectedSignatureBuffer = decodeBase64Url(expectedSignature);

  if (
    providedSignature.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(providedSignature, expectedSignatureBuffer)
  ) {
    throw new Error("room token の署名検証に失敗しました。");
  }

  const parsed = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8")) as SignedRoomTokenPayload;
  const now = Math.floor(Date.now() / 1000);

  if (parsed.v !== ROOM_QR_TOKEN_VERSION) {
    throw new Error("未対応の room token バージョンです。");
  }

  if (!parsed.hotel_id || !parsed.room_id || !parsed.room_number) {
    throw new Error("room token の中身が不正です。");
  }

  if (!Number.isInteger(parsed.iat) || !Number.isInteger(parsed.exp) || parsed.exp <= now) {
    throw new Error("room token の有効期限が切れています。");
  }

  return parsed;
}

export function getGuestRoomUrlBase() {
  return ROOMLY_GUEST_ROOM_PUBLIC_URL_BASE;
}

export function getGuestRoomUrlHostname() {
  return new URL(getGuestRoomUrlBase()).hostname;
}

export function buildGuestRoomUrl(input: GuestRoomLinkInput) {
  const url = new URL(getGuestRoomUrlBase());
  url.searchParams.set("token", createSignedRoomToken(input));
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
