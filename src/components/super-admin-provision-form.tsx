"use client";

import { FormEvent, useState } from "react";

type ProvisionResult = {
  userId: string;
  email: string;
  role: string;
};

export function SuperAdminProvisionForm() {
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
    const response = await fetch("/api/admin/super-admins", {
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
    form.reset();
  }

  return (
    <div className="space-y-4">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm text-stone-700">
          表示名
          <input
            name="displayName"
            className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
            placeholder="MOGCIA Operator"
          />
        </label>

        <label className="grid gap-2 text-sm text-stone-700">
          メールアドレス
          <input
            name="email"
            type="email"
            required
            className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
            placeholder="ops@mogcia.example"
          />
        </label>

        <label className="grid gap-2 text-sm text-stone-700">
          仮パスワード
          <input
            name="temporaryPassword"
            type="password"
            minLength={8}
            required
            className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
            placeholder="8文字以上"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "作成中..." : "super_admin を作成"}
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {result ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          super_admin アカウントを発行しました。対象メールは <strong>{result.email}</strong>、
          Auth uid は <strong>{result.userId}</strong> です。
        </div>
      ) : null}
    </div>
  );
}
