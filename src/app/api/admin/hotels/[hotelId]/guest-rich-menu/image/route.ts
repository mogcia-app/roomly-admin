import { NextRequest, NextResponse } from "next/server";

import { uploadGuestRichMenuImage } from "@/lib/server/roomly-admin";
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
    const image = formData.get("image");
    const imageWidth = Number(formData.get("imageWidth"));
    const imageHeight = Number(formData.get("imageHeight"));

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "image ファイルは必須です。" }, { status: 400 });
    }

    if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
      return NextResponse.json({ error: "imageWidth と imageHeight は必須です。" }, { status: 400 });
    }

    if (!["image/png", "image/jpeg"].includes(image.type)) {
      return NextResponse.json({ error: "PNG または JPEG をアップロードしてください。" }, { status: 400 });
    }

    const uploaded = await uploadGuestRichMenuImage({
      hotelId,
      filename: image.name,
      contentType: image.type,
      buffer: Buffer.from(await image.arrayBuffer()),
      imageWidth,
      imageHeight,
    });

    return NextResponse.json({ image: uploaded }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "画像アップロードに失敗しました。" },
      { status: 500 },
    );
  }
}
