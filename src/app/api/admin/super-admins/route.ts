import { NextRequest, NextResponse } from "next/server";

import { provisionSuperAdmin } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdminRequest(request);
    const contentType = request.headers.get("content-type") ?? "";
    let email = "";
    let temporaryPassword = "";
    let displayName = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      email = String(body.email ?? "").trim();
      temporaryPassword = String(body.temporaryPassword ?? "").trim();
      displayName = String(body.displayName ?? "").trim();
    } else {
      const formData = await request.formData();
      email = String(formData.get("email") ?? "").trim();
      temporaryPassword = String(formData.get("temporaryPassword") ?? "").trim();
      displayName = String(formData.get("displayName") ?? "").trim();
    }

    if (!email || !temporaryPassword) {
      return NextResponse.json(
        { error: "メールアドレスと仮パスワードは必須です。" },
        { status: 400 },
      );
    }

    const result = await provisionSuperAdmin({
      email,
      temporaryPassword,
      displayName: displayName || undefined,
    });

    return NextResponse.json({ provisioned: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "super_admin の作成に失敗しました。" },
      { status: 500 },
    );
  }
}
