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
  { href: "/architecture", label: "設計", section: "architecture" },
] as const;

export function AdminShell({
  title,
  description,
  section,
  children,
}: AdminShellProps) {
  return (
    <div className="min-h-screen w-full lg:pl-[248px]">
      <aside className="panel !rounded-none border-x-0 border-t-0 shadow-none lg:fixed lg:top-0 lg:left-0 lg:mb-0 lg:h-screen lg:w-[248px] lg:border-r lg:border-b-0 lg:p-6">
        <div className="flex h-full flex-col">
          <div className="border-b border-[var(--border)] px-4 py-4 lg:px-0">
            <p className="text-lg font-semibold tracking-[-0.04em] text-stone-950">Roomly Admin</p>
            <p className="mt-1 text-sm text-stone-500">管理メニュー</p>
          </div>

          <nav className="grid gap-1 border-b border-[var(--border)] px-3 py-3 lg:mt-4 lg:border-b-0 lg:px-0 lg:py-0">
            {navigationItems.map((item) => {
              const active = item.section === section;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center rounded-none border px-3.5 text-sm transition ${
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

          <div className="px-3 pb-3 lg:mt-auto lg:px-0 lg:pb-0 lg:pt-5">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col gap-6 lg:min-h-screen">
        <header className="panel !rounded-none border-x-0 border-t-0 px-4 py-3 shadow-none md:px-6 lg:px-8 lg:py-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--accent)] uppercase">
              Roomly Admin
            </p>
            <h1 className="text-lg font-semibold tracking-[-0.04em] text-stone-950 md:text-xl">
              {title}
            </h1>
            <p className="max-w-3xl text-[11px] leading-4 text-stone-600 md:text-xs">{description}</p>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
