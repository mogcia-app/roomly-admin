import { AdminShell } from "@/components/admin-shell";
import { SectionCard } from "@/components/ui";
import { collections } from "@/lib/admin-data";
import { requireSuperAdminPageSession } from "@/lib/server/super-admin-auth";

export const dynamic = "force-dynamic";

const boundaries = [
  {
    area: "This project",
    scope: "super_admin UI, hotel account provisioning, backend APIs, monitoring, QR/PDF operations, and MOGCIA-owned control-plane logic.",
  },
  {
    area: "Hotel project",
    scope: "hotel_admin and hotel_front product surface, front PWA runtime, and authenticated staff workflows.",
  },
  {
    area: "Guest project",
    scope: "QR landing, language selection, AI chat, human handoff, and guest-side call entry.",
  },
] as const;

const apiDecisions = [
  "guest never writes directly to Firestore; all writes route through Next.js APIs.",
  "front can use direct realtime listeners where low latency matters, while admin flows stay API-first for consistency and auditing.",
  "staff_user_id maps directly to Firebase Auth uid, with profile metadata stored in users.",
  "stays is the single source of truth for room-level guest session validity.",
] as const;

export default async function ArchitecturePage() {
  const session = await requireSuperAdminPageSession();

  return (
    <AdminShell
      currentPath="/architecture"
      title="設計とデータモデル"
      description="ホテル側・ゲスト側が別リポジトリでも、このプロジェクトで守るべき固定設計をここに集約します。"
      sessionEmail={session.email}
    >
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="プロジェクト境界"
          description="分割された各リポジトリの責務です。"
        >
          <div className="space-y-4">
            {boundaries.map((item) => (
              <article
                key={item.area}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5"
              >
                <p className="text-base font-semibold text-stone-950">{item.area}</p>
                <p className="mt-3 text-sm leading-6 text-stone-600">{item.scope}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="コレクション設計"
          description="MVPで固定する Firestore 構造です。"
        >
          <div className="space-y-4">
            {collections.map((collection) => (
              <article
                key={collection.name}
                className="rounded-3xl border border-[var(--border)] px-5 py-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-sm text-[var(--accent)]">{collection.name}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {collection.responsibility}
                    </p>
                  </div>
                  <div className="max-w-md rounded-2xl bg-[var(--surface-muted)] px-4 py-3 font-mono text-xs leading-6 text-stone-600">
                    {collection.fields.join(", ")}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="固定済みの API / 権限制約"
        description="このリポジトリの実装で前提にする決定事項です。"
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {apiDecisions.map((item) => (
            <li
              key={item}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-sm leading-6 text-stone-700"
            >
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>
    </AdminShell>
  );
}
