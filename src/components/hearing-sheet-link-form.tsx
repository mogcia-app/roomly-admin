"use client";

import { FormEvent, useState } from "react";

type HotelOption = {
  id: string;
  name: string;
};

type HearingSheetLink = {
  id: string;
  url: string;
  token: string;
  status: string;
};

export function HearingSheetLinkForm({ hotels }: { hotels: HotelOption[] }) {
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<HearingSheetLink | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLink(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const hotelId = String(formData.get("hotelId") ?? "");

    if (!hotelId) {
      setError("hotelId は必須です。");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch(`/api/admin/hotels/${hotelId}/hearing-sheet`, {
      method: "POST",
    });
    const payload = (await response.json()) as { error?: string; link?: HearingSheetLink };
    setIsSubmitting(false);

    if (!response.ok || !payload.link) {
      setError(payload.error ?? "ヒアリングシートURLの発行に失敗しました。");
      return;
    }

    setLink(payload.link);
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
          {isSubmitting ? "発行中..." : "ヒアリングシートURLを発行"}
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {link ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ヒアリングシートURLを発行しました。
          <div className="mt-2 break-all rounded-xl bg-white/80 px-3 py-2 text-xs text-stone-700">
            {link.url}
          </div>
        </div>
      ) : null}
    </div>
  );
}
