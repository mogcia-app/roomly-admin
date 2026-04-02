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
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLink(null);
    setIsSubmitting(true);
    setCopyStatus("idle");

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

  async function handleCopy() {
    if (!link) {
      return;
    }

    try {
      await navigator.clipboard.writeText(link.url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
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
          {isSubmitting ? "発行中..." : "ヒアリングシートURLを発行"}
        </button>
      </form>

      {error ? (
        <p className="form-feedback form-feedback-error">{error}</p>
      ) : null}

      {link ? (
        <div className="form-feedback form-feedback-success">
          ヒアリングシートURLを発行しました。
          <div className="mt-2 rounded-xl border border-emerald-100 bg-white/80 px-3 py-3 text-xs text-stone-700">
            <div className="break-all">{link.url}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                URLをコピー
              </button>
              {copyStatus === "copied" ? <span>コピーしました。</span> : null}
              {copyStatus === "error" ? (
                <span className="text-rose-600">コピーに失敗しました。</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
