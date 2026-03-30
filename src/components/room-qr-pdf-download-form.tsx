"use client";

import { FormEvent, useState } from "react";

type HotelOption = {
  id: string;
  name: string;
};

export function RoomQrPdfDownloadForm({ hotels }: { hotels: HotelOption[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const hotelId = String(formData.get("hotelId") ?? "");

    if (!hotelId) {
      setError("hotelId は必須です。");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch(`/api/admin/hotels/${hotelId}/qrs/pdf`);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "QR PDF のダウンロードに失敗しました。");
      setIsSubmitting(false);
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition");
    const filenameMatch = disposition?.match(/filename="(.+)"/);
    const filename = filenameMatch?.[1] ?? `${hotelId}_room_qrs.pdf`;
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
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
          {isSubmitting ? "PDF生成中..." : "客室QR PDF をダウンロード"}
        </button>
      </form>

      {error ? (
        <p className="form-feedback form-feedback-error">{error}</p>
      ) : null}
    </div>
  );
}
