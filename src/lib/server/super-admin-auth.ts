import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { getFirebaseAdminServices, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";

export const SESSION_COOKIE_NAME = "__session";

export type SuperAdminSession = {
  uid: string;
  email?: string;
  role: string;
};

async function verifySessionCookieValue(sessionCookie: string) {
  const { auth } = getFirebaseAdminServices();
  const decoded = await auth.verifySessionCookie(sessionCookie, true);

  if (decoded.role !== "super_admin") {
    throw new Error("super_admin 権限がありません。");
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    role: String(decoded.role),
  } satisfies SuperAdminSession;
}

export async function getOptionalSuperAdminPageSession() {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    return await verifySessionCookieValue(sessionCookie);
  } catch {
    return null;
  }
}

export async function requireSuperAdminPageSession() {
  const session = await getOptionalSuperAdminPageSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireSuperAdminRequest(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin が設定されていません。");
  }

  const authorization = request.headers.get("authorization");
  const bearerToken =
    authorization && authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : null;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const rawToken = bearerToken ?? sessionCookie;

  if (!rawToken) {
    throw new Error("認証が必要です。");
  }

  try {
    return await verifySessionCookieValue(rawToken);
  } catch {
    throw new Error("認証に失敗しました。");
  }
}
