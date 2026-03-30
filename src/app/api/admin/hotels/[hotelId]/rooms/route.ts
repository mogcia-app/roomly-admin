import { NextRequest, NextResponse } from "next/server";

import {
  createSequentialRoomsForHotel,
  listRooms,
  updateRoomDisplayName,
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
    const rooms = await listRooms(hotelId);

    return NextResponse.json({ rooms });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "客室一覧の取得に失敗しました。" },
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
    const formData = await request.formData();
    const roomCountRaw = Number(formData.get("roomCount"));

    if (!Number.isInteger(roomCountRaw) || roomCountRaw < 1 || roomCountRaw > 500) {
      return NextResponse.json({ error: "roomCount は 1 から 500 の整数で指定してください。" }, { status: 400 });
    }

    const result = await createSequentialRoomsForHotel(hotelId, roomCountRaw);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "客室数の登録に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const payload = (await request.json()) as {
      roomId?: string;
      displayName?: string | null;
    };

    if (!payload.roomId?.trim()) {
      return NextResponse.json({ error: "roomId は必須です。" }, { status: 400 });
    }

    const result = await updateRoomDisplayName(
      hotelId,
      payload.roomId.trim(),
      typeof payload.displayName === "string" ? payload.displayName : null,
    );

    return NextResponse.json({ room: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "客室表示名の更新に失敗しました。" },
      { status: 500 },
    );
  }
}
