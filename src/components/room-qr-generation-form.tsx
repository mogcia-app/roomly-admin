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
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm text-stone-700">
          対象ホテル
          <select
            name="hotelId"
            required
            defaultValue=""
            className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
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
          className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "生成中..." : "客室QRを一括生成"}
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {message ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      ) : null}
    </div>
  );
}
