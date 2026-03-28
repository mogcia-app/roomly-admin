import { NextRequest, NextResponse } from "next/server";

import { expireStay } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stayId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { stayId } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const reason = body.reason?.trim() || "手動チェックアウト";
    const result = await expireStay(stayId, reason);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "滞在の失効に失敗しました。" },
      { status: 500 },
    );
  }
}
