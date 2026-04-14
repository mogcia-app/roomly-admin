"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type HotelOption = {
  id: string;
  name: string;
};

export function RoomQrWorkflowForm({
  hotels,
  selectedHotelId,
  selectedHotelName,
  square = false,
}: {
  hotels: HotelOption[];
  selectedHotelId?: string;
  selectedHotelName?: string;
  square?: boolean;
}) {
  const router = useRouter();
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  async function resolveHotelId(form: HTMLFormElement) {
    const formData = new FormData(form);
    return selectedHotelId ?? String(formData.get("hotelId") ?? "");
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerateError(null);
    setGenerateMessage(null);
    setIsGenerating(true);

    const hotelId = await resolveHotelId(event.currentTarget);

    if (!hotelId) {
      setGenerateError("hotelId は必須です。");
      setIsGenerating(false);
      return;
    }

    const response = await fetch(`/api/admin/hotels/${hotelId}/qrs`, {
      method: "POST",
    });
    const payload = (await response.json()) as { error?: string; generated?: number };
    setIsGenerating(false);

    if (!response.ok) {
      setGenerateError(payload.error ?? "客室QRの生成に失敗しました。");
      return;
    }

    setGenerateMessage(
      `客室QRの生成が完了しました。${payload.generated ?? 0} 室分のゲスト用固定QRを更新しました。`,
    );
    router.refresh();
  }

  async function handleDownload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDownloadError(null);
    setDownloadMessage(null);
    setIsDownloading(true);

    const hotelId = await resolveHotelId(event.currentTarget);

    if (!hotelId) {
      setDownloadError("hotelId は必須です。");
      setIsDownloading(false);
      return;
    }

    const roomsResponse = await fetch(`/api/admin/hotels/${hotelId}/rooms`);

    if (!roomsResponse.ok) {
      const payload = (await roomsResponse.json().catch(() => ({}))) as { error?: string };
      setDownloadError(payload.error ?? "客室一覧の取得に失敗しました。");
      setIsDownloading(false);
      return;
    }

    const roomsPayload = (await roomsResponse.json()) as {
      rooms?: Array<{ id: string; roomNumber: string }>;
    };
    const rooms = roomsPayload.rooms ?? [];

    if (rooms.length === 0) {
      setDownloadError("ダウンロード対象の客室がありません。");
      setIsDownloading(false);
      return;
    }

    for (const room of rooms) {
      const response = await fetch(`/api/admin/hotels/${hotelId}/qrs/pdf?roomId=${encodeURIComponent(room.id)}`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setDownloadError(payload.error ?? `${room.roomNumber}.pdf のダウンロードに失敗しました。`);
        setIsDownloading(false);
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `${room.roomNumber}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }

    setDownloadMessage(
      `${rooms.length} 室分のPDFを順番にダウンロードしました。ブラウザの複数ダウンロード許可が必要な場合があります。`,
    );
    setIsDownloading(false);
  }

  const hotelBannerClass = `${square ? "!rounded-none" : "rounded-2xl"} border border-[rgba(180,59,34,0.22)] bg-[rgba(246,216,203,0.52)] px-4 py-3 text-sm text-[var(--foreground)]`;
  const submitClass = `form-submit ${square ? "!rounded-none" : ""}`;
  const feedbackErrorClass = `form-feedback form-feedback-error ${square ? "!rounded-none" : ""}`;
  const feedbackSuccessClass = `form-feedback form-feedback-success ${square ? "!rounded-none" : ""}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-stone-950">1. 客室QRを生成</p>
        <p className="text-sm leading-6 text-stone-600">先に固定QRを更新してから、続けてPDFを出力します。</p>
      </div>

      <form className="form-grid" onSubmit={handleGenerate}>
        {selectedHotelId ? (
          <div className={hotelBannerClass}>
            対象ホテル: <strong>{selectedHotelName ?? selectedHotelId}</strong>
            <input type="hidden" name="hotelId" value={selectedHotelId} />
          </div>
        ) : (
          <label className="form-label">
            対象ホテル
            <select
              name="hotelId"
              required
              defaultValue=""
              className={`form-select ${square ? "!rounded-none" : ""}`}
            >
              <option value="" disabled>
                ホテルを選択
              </option>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <button type="submit" disabled={isGenerating} className={submitClass}>
          {isGenerating ? "生成中..." : "客室QRを一括生成"}
        </button>
      </form>

      {generateError ? <p className={feedbackErrorClass}>{generateError}</p> : null}
      {generateMessage ? <p className={feedbackSuccessClass}>{generateMessage}</p> : null}

      <div className="border-t border-[var(--border)] pt-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-stone-950">2. 客室QR PDF を出力</p>
          <p className="text-sm leading-6 text-stone-600">QR生成後、そのまま印刷用PDFをまとめてダウンロードします。</p>
        </div>

        <form className="mt-4 form-grid" onSubmit={handleDownload}>
          {selectedHotelId ? (
            <div className={hotelBannerClass}>
              対象ホテル: <strong>{selectedHotelName ?? selectedHotelId}</strong>
              <input type="hidden" name="hotelId" value={selectedHotelId} />
            </div>
          ) : (
            <label className="form-label">
              対象ホテル
              <select
                name="hotelId"
                required
                defaultValue=""
                className={`form-select ${square ? "!rounded-none" : ""}`}
              >
                <option value="" disabled>
                  ホテルを選択
                </option>
                {hotels.map((hotel) => (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button type="submit" disabled={isDownloading} className={submitClass}>
            {isDownloading ? "PDF生成中..." : "客室QR PDF を一括ダウンロード"}
          </button>
        </form>

        {downloadError ? <p className={`mt-4 ${feedbackErrorClass}`}>{downloadError}</p> : null}
        {downloadMessage ? <p className={`mt-4 ${feedbackSuccessClass}`}>{downloadMessage}</p> : null}
      </div>
    </div>
  );
}
