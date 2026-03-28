import { NextRequest, NextResponse } from "next/server";

import { listRooms } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const rooms = await listRooms(hotelId);

    return NextResponse.json({ rooms });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "客室一覧の取得に失敗しました。" },
      { status: 500 },
    );
  }
}
