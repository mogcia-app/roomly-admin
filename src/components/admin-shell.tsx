import Link from "next/link";
import { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";

type AdminShellProps = {
  title: string;
  description: string;
  section?: "dashboard" | "hotels" | "guest-rich-menus" | "operations" | "architecture";
  children: ReactNode;
};

const navigationItems = [
  { href: "/", label: "ダッシュボード", section: "dashboard" },
  { href: "/hotels", label: "ホテル導入", section: "hotels" },
  { href: "/guest-rich-menus", label: "Guest Menu", section: "guest-rich-menus" },
  { href: "/operations", label: "運用監視", section: "operations" },
  { href: "/architecture", label: "設計", section: "architecture" },
] as const;

export function AdminShell({
  title,
  description,
  section,
  children,
}: AdminShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1280px] px-4 py-4 md:px-6 lg:px-8">
      <main className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="panel hero-panel overflow-hidden p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-600">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                MOGCIA Control
              </div>
              <LogoutButton />
            </div>

            <nav className="flex flex-wrap gap-2">
              {navigationItems.map((item) => {
                const active = item.section === section;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex min-h-10 items-center border px-4 text-sm transition ${
                      active
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-[var(--border)] bg-white/72 text-stone-700 hover:bg-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="max-w-3xl space-y-3">
              <p className="eyebrow">Operational Console</p>
              <h2 className="text-4xl font-semibold tracking-[-0.06em] text-stone-950 md:text-5xl">
                {title}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                {description}
              </p>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
