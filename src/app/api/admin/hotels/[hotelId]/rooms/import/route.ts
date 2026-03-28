import { NextRequest, NextResponse } from "next/server";

import { parseCsv } from "@/lib/server/csv";
import { importRoomsForHotel } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSVファイルは必須です。" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSVにデータ行がありません。" }, { status: 400 });
    }

    const normalized = rows.map((row, index) => {
      const roomNumber = row.room_number?.trim() || row.roomNumber?.trim() || "";

      if (!roomNumber) {
        throw new Error(`${index + 2}行目の room_number は必須です。`);
      }

      return {
        roomNumber,
        floor: row.floor?.trim() || undefined,
        roomType: row.room_type?.trim() || row.roomType?.trim() || undefined,
      };
    });

    const result = await importRoomsForHotel(hotelId, normalized);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "客室CSVの取り込みに失敗しました。" },
      { status: 500 },
    );
  }
}
