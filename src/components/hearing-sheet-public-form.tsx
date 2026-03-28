"use client";

import { FormEvent, useState } from "react";

type SheetData = {
  contactName?: string;
  contactEmail?: string;
  checkInTime?: string;
  checkOutTime?: string;
  wifiPassword?: string;
  breakfastInfo?: string;
  parkingInfo?: string;
  amenitiesInfo?: string;
  emergencyNote?: string;
  customQa?: string;
};

export function HearingSheetPublicForm({
  token,
  initialData,
}: {
  token: string;
  initialData?: SheetData | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch(`/api/public/hearing-sheet/${token}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(result.error ?? "送信に失敗しました。");
      return;
    }

    setSuccess("ヒアリングシートを送信しました。内容は管理画面で確認できます。");
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="担当者名" name="contactName" defaultValue={initialData?.contactName} required />
        <Field
          label="担当者メールアドレス"
          name="contactEmail"
          type="email"
          defaultValue={initialData?.contactEmail}
          required
        />
        <Field
          label="チェックイン時刻"
          name="checkInTime"
          defaultValue={initialData?.checkInTime}
          placeholder="15:00"
          required
        />
        <Field
          label="チェックアウト時刻"
          name="checkOutTime"
          defaultValue={initialData?.checkOutTime}
          placeholder="10:00"
          required
        />
        <Field
          label="Wi-Fiパスワード"
          name="wifiPassword"
          defaultValue={initialData?.wifiPassword}
        />
        <Field
          label="朝食情報"
          name="breakfastInfo"
          defaultValue={initialData?.breakfastInfo}
          placeholder="会場、時間、料金など"
        />
      </div>

      <TextArea
        label="駐車場情報"
        name="parkingInfo"
        defaultValue={initialData?.parkingInfo}
        placeholder="場所、料金、事前予約の要否など"
      />
      <TextArea
        label="アメニティ情報"
        name="amenitiesInfo"
        defaultValue={initialData?.amenitiesInfo}
        placeholder="歯ブラシ、タオル、貸出備品など"
      />
      <TextArea
        label="緊急時メモ"
        name="emergencyNote"
        defaultValue={initialData?.emergencyNote}
        placeholder="夜間連絡先、避難案内、注意事項など"
      />
      <TextArea
        label="カスタムQ&A"
        name="customQa"
        defaultValue={initialData?.customQa}
        placeholder="ホテル独自の質問と回答をまとめて入力してください"
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-2xl bg-[var(--accent)] px-5 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "送信中..." : "ヒアリングシートを送信"}
      </button>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {success ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-stone-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-stone-700">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={4}
        className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
      />
    </label>
  );
}
