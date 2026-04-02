import { NextRequest, NextResponse } from "next/server";

import {
  getLatestHearingSheetLink,
  issueHearingSheetLink,
} from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const link = await getLatestHearingSheetLink(hotelId);

    return NextResponse.json({ link });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ヒアリングシートURLの取得に失敗しました。" },
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
    const hearingSheetBaseUrl =
      process.env.HOTEL_HEARING_SHEET_URL_BASE?.trim() || `${request.nextUrl.origin}/hearing-sheet`;
    const link = await issueHearingSheetLink(
      hotelId,
      hearingSheetBaseUrl,
    );

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ヒアリングシートURLの発行に失敗しました。" },
      { status: 500 },
    );
  }
}
