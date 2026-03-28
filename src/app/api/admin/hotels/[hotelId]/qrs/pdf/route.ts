import { NextRequest, NextResponse } from "next/server";

import { generateRoomQrPdf, getHotelById } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const [pdfBytes, hotel] = await Promise.all([generateRoomQrPdf(hotelId), getHotelById(hotelId)]);
    const safeHotelName = (hotel?.name ?? hotelId).replace(/[^\p{L}\p{N}_-]+/gu, "_");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${safeHotelName}_room_qrs.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "QR PDF の生成に失敗しました。" },
      { status: 500 },
    );
  }
}
