"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

import { auth } from "@/lib/firebase";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    await signOut(auth).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-[var(--surface-muted)]"
    >
      ログアウト
    </button>
  );
}
