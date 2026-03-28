import Link from "next/link";
import { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";

const navigation = [
  { href: "/", label: "概要" },
  { href: "/hotels", label: "ホテル管理" },
  { href: "/operations", label: "運用監視" },
  { href: "/architecture", label: "設計" },
] as const;

type AdminShellProps = {
  currentPath: string;
  title: string;
  description: string;
  sessionEmail?: string;
  children: ReactNode;
};

export function AdminShell({
  currentPath,
  title,
  description,
  sessionEmail,
  children,
}: AdminShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 md:px-6 lg:px-8">
      <aside className="panel hidden w-[280px] shrink-0 flex-col justify-between p-6 lg:flex">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="eyebrow">Roomly Admin</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.05em]">MOGCIA運用</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                ホテル発行、通話基盤、AI運用を管理する super_admin 向けコンソールです。
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const active = currentPath === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface-muted)] text-stone-700 hover:bg-[var(--accent-soft)]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-xs uppercase tracking-[0.24em]">
                    {active ? "現在地" : "移動"}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rounded-3xl bg-[var(--surface-strong)] p-5 text-stone-100">
          <p className="eyebrow text-[#f3d8d2]">固定方針</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-200">
            <li>ゲスト書き込みは Next.js API 経由のみに固定。</li>
            <li>`staff_user_id` は Firebase Auth uid に統一。</li>
            <li>claims 付与は MOGCIA 管理バックエンドのみ。</li>
          </ul>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="panel overflow-hidden p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="eyebrow">Super Admin 管理画面</p>
              <h2 className="text-4xl font-semibold tracking-[-0.06em] text-stone-950 md:text-5xl">
                {title}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                {description}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,1.2fr)]">
              <StatusCard label="認証権限" value="super_admin" />
              <StatusCard label="ホスティング" value="Vercel + Firebase" />
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-stone-500">
                  セッション
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-stone-900">
                    {sessionEmail ?? "ログイン中"}
                  </p>
                  <LogoutButton />
                </div>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-stone-900">{value}</p>
    </div>
  );
}
