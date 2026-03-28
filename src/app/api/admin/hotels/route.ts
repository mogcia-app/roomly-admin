import { NextRequest, NextResponse } from "next/server";

import { listHotels, provisionHotelAdmin } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

function readJsonString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdminRequest(request);
    const hotels = await listHotels();

    return NextResponse.json({ hotels });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ホテル一覧の取得に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdminRequest(request);
    const contentType = request.headers.get("content-type") ?? "";
    let hotelName = "";
    let plan = "";
    let hotelAdminEmail = "";
    let temporaryPassword = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      hotelName = String(body.hotelName ?? "").trim();
      plan = String(body.plan ?? "").trim();
      hotelAdminEmail = String(body.hotelAdminEmail ?? "").trim();
      temporaryPassword = String(body.temporaryPassword ?? "").trim();
    } else {
      const formData = await request.formData();
      hotelName = readJsonString(formData.get("hotelName"));
      plan = readJsonString(formData.get("plan"));
      hotelAdminEmail = readJsonString(formData.get("hotelAdminEmail"));
      temporaryPassword = readJsonString(formData.get("temporaryPassword"));
    }

    if (!hotelName || !plan || !hotelAdminEmail || !temporaryPassword) {
      return NextResponse.json(
        {
          error: "ホテル名、プラン、hotel_admin メールアドレス、仮パスワードは必須です。",
        },
        { status: 400 },
      );
    }

    const result = await provisionHotelAdmin({
      hotelName,
      plan,
      hotelAdminEmail,
      temporaryPassword,
    });

    return NextResponse.json({ provisioned: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "hotel_admin の作成に失敗しました。" },
      { status: 500 },
    );
  }
}
