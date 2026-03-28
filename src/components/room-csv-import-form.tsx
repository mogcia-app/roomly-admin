"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type HotelOption = {
  id: string;
  name: string;
};

export function RoomCsvImportForm({ hotels }: { hotels: HotelOption[] }) {
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

    const response = await fetch(`/api/admin/hotels/${hotelId}/rooms/import`, {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { error?: string; imported?: number };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "取り込みに失敗しました。");
      return;
    }

    setMessage(
      `客室CSVの取り込みが完了しました。${payload.imported ?? 0} 件の客室を rooms に登録しました。`,
    );
    form.reset();
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

        <label className="grid gap-2 text-sm text-stone-700">
          CSVファイル
          <input
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-2 file:text-sm file:font-semibold"
          />
        </label>

        <p className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-xs leading-6 text-stone-600">
          期待するヘッダー: <code>room_number</code>, <code>floor</code>, <code>room_type</code>
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "取り込み中..." : "客室CSVを取り込む"}
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
