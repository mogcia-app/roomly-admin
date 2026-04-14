import { NextRequest, NextResponse } from "next/server";

import { listHotels, provisionHotelAdmin } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

function readJsonString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDateString(date: Date) {
  return date.toISOString().slice(0, 10);
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
    let provisionMode = "standard";
    let hotelName = "";
    let plan = "";
    let contractStartDate = "";
    let contractEndDate = "";
    let hotelAdminEmail = "";
    let temporaryPassword = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      provisionMode = String(body.provisionMode ?? "standard").trim() || "standard";
      hotelName = String(body.hotelName ?? "").trim();
      plan = String(body.plan ?? "").trim();
      contractStartDate = String(body.contractStartDate ?? "").trim();
      contractEndDate = String(body.contractEndDate ?? "").trim();
      hotelAdminEmail = String(body.hotelAdminEmail ?? "").trim();
      temporaryPassword = String(body.temporaryPassword ?? "").trim();
    } else {
      const formData = await request.formData();
      provisionMode = readJsonString(formData.get("provisionMode")) || "standard";
      hotelName = readJsonString(formData.get("hotelName"));
      plan = readJsonString(formData.get("plan"));
      contractStartDate = readJsonString(formData.get("contractStartDate"));
      contractEndDate = readJsonString(formData.get("contractEndDate"));
      hotelAdminEmail = readJsonString(formData.get("hotelAdminEmail"));
      temporaryPassword = readJsonString(formData.get("temporaryPassword"));
    }

    if (provisionMode === "trial") {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      plan = plan || "Trial";
      contractStartDate = contractStartDate || formatDateString(startDate);
      contractEndDate = contractEndDate || formatDateString(endDate);
    } else {
      plan = plan || "Basic";
    }

    if (!hotelName || !hotelAdminEmail || !temporaryPassword) {
      return NextResponse.json(
        { error: "ホテル名、ホテル管理者メールアドレス、仮パスワードは必須です。" },
        { status: 400 },
      );
    }

    if (!plan || !contractStartDate || !contractEndDate) {
      return NextResponse.json(
        {
          error: "ホテル名、契約開始日、契約終了日、ホテル管理者メールアドレス、仮パスワードは必須です。",
        },
        { status: 400 },
      );
    }

    if (Number.isNaN(Date.parse(contractStartDate)) || Number.isNaN(Date.parse(contractEndDate))) {
      return NextResponse.json({ error: "契約開始日と契約終了日は有効な日付を指定してください。" }, { status: 400 });
    }

    if (contractEndDate < contractStartDate) {
      return NextResponse.json({ error: "契約終了日は契約開始日以降を指定してください。" }, { status: 400 });
    }

    const result = await provisionHotelAdmin({
      hotelName,
      plan,
      contractStartDate,
      contractEndDate,
      hotelAdminEmail,
      temporaryPassword,
    });

    return NextResponse.json({ provisioned: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ホテルの作成に失敗しました。" },
      { status: 500 },
    );
  }
}
