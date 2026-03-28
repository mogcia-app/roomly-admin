import { NextRequest, NextResponse } from "next/server";

import {
  getHearingSheetByToken,
  submitHearingSheetByToken,
  type HearingSheetPayload,
} from "@/lib/server/roomly-admin";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const data = await getHearingSheetByToken(token);

    if (!data) {
      return NextResponse.json({ error: "ヒアリングシートURLが無効です。" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ヒアリングシートの取得に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = (await request.json()) as Partial<HearingSheetPayload>;

    const payload: HearingSheetPayload = {
      contactName: String(body.contactName ?? "").trim(),
      contactEmail: String(body.contactEmail ?? "").trim(),
      checkInTime: String(body.checkInTime ?? "").trim(),
      checkOutTime: String(body.checkOutTime ?? "").trim(),
      wifiPassword: String(body.wifiPassword ?? "").trim(),
      breakfastInfo: String(body.breakfastInfo ?? "").trim(),
      parkingInfo: String(body.parkingInfo ?? "").trim(),
      amenitiesInfo: String(body.amenitiesInfo ?? "").trim(),
      emergencyNote: String(body.emergencyNote ?? "").trim(),
      customQa: String(body.customQa ?? "").trim(),
    };

    if (!payload.contactName || !payload.contactEmail || !payload.checkInTime || !payload.checkOutTime) {
      return NextResponse.json(
        { error: "担当者名、メールアドレス、チェックイン時刻、チェックアウト時刻は必須です。" },
        { status: 400 },
      );
    }

    const result = await submitHearingSheetByToken(token, payload);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ヒアリングシートの送信に失敗しました。" },
      { status: 500 },
    );
  }
}
