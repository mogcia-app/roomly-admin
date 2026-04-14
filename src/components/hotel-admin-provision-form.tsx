"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProvisionResult = {
  hotelId: string;
  userId: string;
  email: string;
  role: string;
};

export function HotelAdminProvisionForm({
  onProvisioned,
  square = false,
}: {
  onProvisioned?: (hotel: { id: string; name: string }) => void;
  square?: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProvisionResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const hotelName = String(formData.get("hotelName") ?? "").trim();

    const response = await fetch("/api/admin/hotels", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as {
      error?: string;
      provisioned?: ProvisionResult;
    };

    setIsSubmitting(false);

    if (!response.ok || !payload.provisioned) {
      setError(payload.error ?? "作成に失敗しました。");
      return;
    }

    setResult(payload.provisioned);
    onProvisioned?.({ id: payload.provisioned.hotelId, name: hotelName });
    form.reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="form-label">
          ホテル名
          <input
            name="hotelName"
            required
            className={`form-input ${square ? "!rounded-none" : ""}`}
            placeholder="Akari Ryokan"
          />
        </label>

        <label className="form-label">
          プラン
          <input
            name="plan"
            required
            defaultValue="Basic"
            className={`form-input ${square ? "!rounded-none" : ""}`}
          />
        </label>

        <label className="form-label">
          契約開始日
          <input
            name="contractStartDate"
            type="date"
            required
            className={`form-input ${square ? "!rounded-none" : ""}`}
          />
        </label>

        <label className="form-label">
          契約終了日
          <input
            name="contractEndDate"
            type="date"
            required
            className={`form-input ${square ? "!rounded-none" : ""}`}
          />
        </label>

        <label className="form-label">
          ホテル管理者メールアドレス
          <input
            name="hotelAdminEmail"
            type="email"
            required
            className={`form-input ${square ? "!rounded-none" : ""}`}
            placeholder="owner@example.com"
          />
        </label>

        <label className="form-label">
          仮パスワード
          <input
            name="temporaryPassword"
            type="password"
            minLength={8}
            required
            className={`form-input ${square ? "!rounded-none" : ""}`}
            placeholder="8文字以上"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`form-submit ${square ? "!rounded-none" : ""}`}
        >
          {isSubmitting ? "作成中..." : "ホテルを作成"}
        </button>
      </form>

      {error ? (
        <p className={`form-feedback form-feedback-error ${square ? "!rounded-none" : ""}`}>{error}</p>
      ) : null}

      {result ? (
        <div className={`form-feedback form-feedback-success ${square ? "!rounded-none" : ""}`}>
          ホテル管理者アカウントを発行しました。対象メールは <strong>{result.email}</strong>、
          発行された hotel_id は <strong>{result.hotelId}</strong>、Auth uid は{" "}
          <strong>{result.userId}</strong> です。
        </div>
      ) : null}
    </div>
  );
}
