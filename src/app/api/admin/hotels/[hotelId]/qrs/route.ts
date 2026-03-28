import { NextRequest, NextResponse } from "next/server";

import { generateRoomQrsForHotel, listRoomQrs } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const qrs = await listRoomQrs(hotelId);

    return NextResponse.json({ qrs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "QR一覧の取得に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const result = await generateRoomQrsForHotel(hotelId);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "客室QRの生成に失敗しました。" },
      { status: 500 },
    );
  }
}
