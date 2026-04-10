"use client";

import { useState } from "react";

import { HearingSheetAdminEditor } from "@/components/hearing-sheet-admin-editor";
import { StatusPill } from "@/components/ui";
import type { HearingSheetData } from "@/lib/server/roomly-admin";

type HearingSheetLink = {
  id: string;
  url: string;
  token: string;
  status: string;
};

export function ContractsHotelCard({
  hotelId,
  hotelName,
  plan,
  hotelAdminEmail,
  roomCount,
  hearingSheet,
}: {
  hotelId: string;
  hotelName: string;
  plan: string;
  hotelAdminEmail?: string | null;
  roomCount: number;
  hearingSheet?: HearingSheetData;
}) {
  const hasSheet = Boolean(hearingSheet);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<HearingSheetLink | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handlePrimaryClick() {
    setError(null);

    if (hasSheet) {
      setIsExpanded((current) => !current);
      return;
    }

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
    <article className="border border-[var(--border)] bg-white p-4">
      <button
        type="button"
        onClick={handlePrimaryClick}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <p className="text-base font-semibold text-stone-950">{hotelName}</p>
          <p className="mt-1 font-mono text-xs text-stone-500">hotel_id: {hotelId}</p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            プラン {plan} / {hotelAdminEmail ?? "メール未登録"} / 客室 {roomCount}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusPill tone={hasSheet ? "success" : "warning"}>
            {hasSheet ? "記入済み" : "未記入"}
          </StatusPill>
          <span className="text-xs text-stone-500">
            {hasSheet ? (isExpanded ? "編集を閉じる" : "クリックで編集") : isSubmitting ? "発行中..." : "クリックでURL発行"}
          </span>
        </div>
      </button>

      {error ? <p className="form-feedback form-feedback-error mt-4">{error}</p> : null}

      {!hasSheet && link ? (
        <div className="form-feedback form-feedback-success mt-4">
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

      {hearingSheet && isExpanded ? (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <HearingSheetAdminEditor hotelId={hotelId} initialData={hearingSheet} initiallyOpen />
        </div>
      ) : null}
    </article>
  );
}
