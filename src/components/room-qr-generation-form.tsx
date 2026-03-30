"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type HotelOption = {
  id: string;
  name: string;
};

export function RoomQrGenerationForm({ hotels }: { hotels: HotelOption[] }) {
  const router = useRouter();
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

    const response = await fetch(`/api/admin/hotels/${hotelId}/qrs`, {
      method: "POST",
    });
    const payload = (await response.json()) as { error?: string; generated?: number };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "客室QRの生成に失敗しました。");
      return;
    }

    setMessage(
      `客室QRの生成が完了しました。${payload.generated ?? 0} 室分のゲスト用固定QRを更新しました。`,
    );
    router.refresh();
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
          {isSubmitting ? "生成中..." : "客室QRを一括生成"}
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
