import { NextRequest, NextResponse } from "next/server";

import { normalizeGuestRichMenuInput, validateGuestRichMenuInput } from "@/lib/guest-rich-menu";
import { getGuestRichMenuByHotelId, saveGuestRichMenuByHotelId } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const menu = await getGuestRichMenuByHotelId(hotelId);

    return NextResponse.json({ menu });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "guest rich menu の取得に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const payload = normalizeGuestRichMenuInput(await request.json());
    const errors = validateGuestRichMenuInput(payload);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join("\n"), errors }, { status: 400 });
    }

    const menu = await saveGuestRichMenuByHotelId(hotelId, payload);

    return NextResponse.json({ menu });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "guest rich menu の保存に失敗しました。" },
      { status: 500 },
    );
  }
}
