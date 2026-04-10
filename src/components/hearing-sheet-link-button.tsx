"use client";

import { useState } from "react";

type HearingSheetLink = {
  id: string;
  url: string;
  token: string;
  status: string;
};

export function HearingSheetLinkButton({
  hotelId,
}: {
  hotelId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<HearingSheetLink | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleGenerate() {
    setError(null);
    setLink(null);
    setIsSubmitting(true);
    setCopyStatus("idle");

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
    <div className="space-y-3">
      <button type="button" onClick={handleGenerate} disabled={isSubmitting} className="form-submit">
        {isSubmitting ? "発行中..." : "URLを発行"}
      </button>

      {error ? <p className="form-feedback form-feedback-error">{error}</p> : null}

      {link ? (
        <div className="form-feedback form-feedback-success">
          <div className="break-all text-xs text-stone-700">{link.url}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              URLをコピー
            </button>
            {copyStatus === "copied" ? <span className="text-xs text-stone-600">コピーしました。</span> : null}
            {copyStatus === "error" ? <span className="text-xs text-rose-600">コピー失敗</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
