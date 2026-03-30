"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type HotelOption = {
  id: string;
  name: string;
};

export function RoomCountSetupForm({ hotels }: { hotels: HotelOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const hotelId = String(formData.get("hotelId") ?? "");

    if (!hotelId) {
      setError("hotelId は必須です。");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch(`/api/admin/hotels/${hotelId}/rooms`, {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { error?: string; imported?: number };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "客室数の登録に失敗しました。");
      return;
    }

    setMessage(
      `${payload.imported ?? 0} 室分の客室を登録しました。部屋番号は 101 からの連番で作成しています。`,
    );
    form.reset();
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

        <label className="form-label">
          部屋数
          <input
            name="roomCount"
            type="number"
            min={1}
            max={500}
            required
            className="form-input"
            placeholder="20"
          />
        </label>

        <p className="form-hint">
          既に客室が登録されているホテルには追加できません。最小運用向けに、部屋番号は
          <code>101</code> から自動採番します。
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="form-submit"
        >
          {isSubmitting ? "登録中..." : "部屋数を登録"}
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
