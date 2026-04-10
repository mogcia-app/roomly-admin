import { NextRequest, NextResponse } from "next/server";

import { generateRoomQrPdf, generateSingleRoomQrPdf, getHotelById, listRooms } from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const roomId = request.nextUrl.searchParams.get("roomId")?.trim();

    if (roomId) {
      const [pdfBytes, rooms] = await Promise.all([generateSingleRoomQrPdf(hotelId, roomId), listRooms(hotelId)]);
      const room = rooms.find((entry) => entry.id === roomId);
      const roomNumber = room?.roomNumber?.trim() || roomId;

      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${roomNumber}.pdf"`,
        },
      });
    }

    const [pdfBytes, hotel] = await Promise.all([generateRoomQrPdf(hotelId), getHotelById(hotelId)]);
    const asciiHotelName = (hotel?.name ?? "")
      .normalize("NFKC")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/[^A-Za-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const safeHotelName = asciiHotelName || hotelId;

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
