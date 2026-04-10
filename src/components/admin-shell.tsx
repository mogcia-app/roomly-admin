import Link from "next/link";
import { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";

type AdminShellProps = {
  title: string;
  description: string;
  section?: "hotels" | "contracts" | "guest-rich-menus" | "operations" | "architecture";
  children: ReactNode;
};

const navigationItems = [
  { href: "/hotels", label: "ホテル導入", section: "hotels" },
  { href: "/contracts", label: "契約ホテル一覧", section: "contracts" },
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
    <div className="min-h-screen w-full px-4 py-4 md:px-6 lg:px-8">
      <aside className="panel mb-6 p-4 md:p-5 lg:fixed lg:top-6 lg:left-8 lg:mb-0 lg:h-[calc(100vh-3rem)] lg:w-[248px] lg:p-6">
        <div className="flex h-full flex-col">
          <div className="border-b border-[var(--border)] pb-4">
            <p className="text-lg font-semibold tracking-[-0.04em] text-stone-950">Roomly Admin</p>
            <p className="mt-1 text-sm text-stone-500">管理メニュー</p>
          </div>

          <nav className="mt-4 grid gap-1.5">
            {navigationItems.map((item) => {
              const active = item.section === section;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center rounded-xl border px-3.5 text-sm transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--foreground)]"
                      : "border-transparent bg-transparent text-stone-700 hover:border-[var(--border)] hover:bg-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          <div className="mt-auto pt-5">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col gap-6 lg:ml-[280px] lg:min-h-[calc(100vh-3rem)]">
        <header className="panel p-6 md:p-7">
          <div className="space-y-3">
            <p className="eyebrow">Roomly Admin</p>
            <h1 className="text-3xl font-semibold tracking-[-0.06em] text-stone-950 md:text-4xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-stone-600 md:text-base">{description}</p>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
