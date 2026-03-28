"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ExpireStayButton({ stayId }: { stayId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("手動チェックアウト");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleExpire() {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/stays/${stayId}/expire`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "滞在の失効に失敗しました。");
      return;
    }

    setSuccess("滞在ステータスを手動で失効しました。次回アクセス時は非アクティブとして扱われます。");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="w-full rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-xs outline-none transition focus:border-[var(--accent)]"
        placeholder="失効理由"
      />
      <button
        type="button"
        onClick={handleExpire}
        disabled={isPending}
        className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "失効中..." : "滞在を失効する"}
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-700">{success}</p> : null}
    </div>
  );
}
