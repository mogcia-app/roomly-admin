import { NextRequest, NextResponse } from "next/server";

import { listActiveStays } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const stays = await listActiveStays(hotelId);

    return NextResponse.json({ stays });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "滞在一覧の取得に失敗しました。" },
      { status: 500 },
    );
  }
}
