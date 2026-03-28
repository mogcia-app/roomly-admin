import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getFirebaseAdminServices } from "@/lib/server/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { idToken?: string };
    const idToken = body.idToken?.trim();

    if (!idToken) {
      return NextResponse.json({ error: "idToken は必須です。" }, { status: 400 });
    }

    const { auth } = getFirebaseAdminServices();
    const decoded = await auth.verifyIdToken(idToken);

    if (decoded.role !== "super_admin") {
      return NextResponse.json({ error: "super_admin 権限がありません。" }, { status: 403 });
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "セッションの作成に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ ok: true });
}
