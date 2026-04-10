"use client";

import { FormEvent, useState } from "react";

type HotelOption = {
  id: string;
  name: string;
};

export function RoomQrPdfDownloadForm({ hotels }: { hotels: HotelOption[] }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const hotelId = String(formData.get("hotelId") ?? "");

    if (!hotelId) {
      setError("hotelId は必須です。");
      setIsSubmitting(false);
      return;
    }

    const roomsResponse = await fetch(`/api/admin/hotels/${hotelId}/rooms`);

    if (!roomsResponse.ok) {
      const payload = (await roomsResponse.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "客室一覧の取得に失敗しました。");
      setIsSubmitting(false);
      return;
    }

    const roomsPayload = (await roomsResponse.json()) as {
      error?: string;
      rooms?: Array<{ id: string; roomNumber: string }>;
    };
    const rooms = roomsPayload.rooms ?? [];

    if (rooms.length === 0) {
      setError("ダウンロード対象の客室がありません。");
      setIsSubmitting(false);
      return;
    }

    for (const room of rooms) {
      const response = await fetch(`/api/admin/hotels/${hotelId}/qrs/pdf?roomId=${encodeURIComponent(room.id)}`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? `${room.roomNumber}.pdf のダウンロードに失敗しました。`);
        setIsSubmitting(false);
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

    setMessage(
      `${rooms.length} 室分のPDFを順番にダウンロードしました。ブラウザの複数ダウンロード許可が必要な場合があります。`,
    );
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-4">
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="form-label">
          対象ホテル
          <select
            name="hotelId"
            required
            defaultValue=""
            className="form-select"
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="form-submit"
        >
          {isSubmitting ? "PDF生成中..." : "客室QR PDF を一括ダウンロード"}
        </button>
      </form>

      {error ? (
        <p className="form-feedback form-feedback-error">{error}</p>
      ) : null}

      {message ? (
        <p className="form-feedback form-feedback-success">{message}</p>
      ) : null}
    </div>
  );
}
