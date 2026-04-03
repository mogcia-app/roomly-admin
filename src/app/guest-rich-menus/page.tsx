import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { GuestRichMenuEditor } from "@/components/guest-rich-menu-editor";
import { SectionCard, StatusPill } from "@/components/ui";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { getGuestRichMenuByHotelId, listHotels } from "@/lib/server/roomly-admin";
import { requireSuperAdminPageSession } from "@/lib/server/super-admin-auth";

export const dynamic = "force-dynamic";

export default async function GuestRichMenusPage({
  searchParams,
}: {
  searchParams?: Promise<{ hotelId?: string }>;
}) {
  await requireSuperAdminPageSession();
  const configured = isFirebaseAdminConfigured();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const hotels = configured ? await listHotels() : [];
  const initialHotelId = resolvedSearchParams?.hotelId?.trim() || hotels[0]?.id;
  const initialMenu = configured && initialHotelId ? await getGuestRichMenuByHotelId(initialHotelId) : null;
  const enabledCount = configured
    ? (
        await Promise.all(
          hotels.map(async (hotel) => ({
            hotel,
            menu: await getGuestRichMenuByHotelId(hotel.id),
          })),
        )
      ).filter((entry) => entry.menu?.enabled).length
    : 0;

  return (
    <AdminShell
      section="guest-rich-menus"
      title="Guest リッチメニュー"
      description="ホテルごとに guest 用リッチメニュー画像とタップ領域を管理します。Canva 制作画像をそのまま使い、項目数・表示順・アクションをホテル単位で自由に編集できます。"
    >
      {!configured ? (
        <section className="panel border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          Firebase Admin が未設定です。Firestore と Storage を有効にすると guest rich menu を保存できます。
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="対象ホテル数" value={String(hotels.length)} />
        <MetricCard label="有効メニュー数" value={String(enabledCount)} />
        <MetricCard label="推奨サイズ" value="1200x810" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <SectionCard
          title="運用ルール"
          description="guest 側は hotelId で Firestore の guest_rich_menus/{hotelId} を読みます。"
        >
          <div className="space-y-3 text-sm leading-7 text-stone-600">
            <p>
              保存されるのは <code>enabled === true</code> のドキュメントです。guest 側はさらに
              <code>visible === true</code> の項目だけを <code>sortOrder</code> 昇順で利用します。
            </p>
            <p>
              画像は Firebase Storage の <code>guest-rich-menus/{`{hotelId}`}/...</code> に保存し、
              Firestore には <code>imageUrl</code>, <code>imageWidth</code>, <code>imageHeight</code> を
              そのまま持たせます。
            </p>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-stone-950">フォールバック方針</p>
                <StatusPill tone="warning">guest 実装と要統一</StatusPill>
              </div>
              <p className="mt-2">
                設定がないホテルではメニュー非表示にする前提で進めるのが自然です。既定メニューを出す場合は guest
                側と同じルールに揃えてください。
              </p>
            </div>
            <Link href="/hotels" className="inline-flex text-sm font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
              ホテル導入ページへ戻る
            </Link>
          </div>
        </SectionCard>

        <GuestRichMenuEditor
          hotels={hotels.map((hotel) => ({ id: hotel.id, name: hotel.name }))}
          initialHotelId={initialHotelId}
          initialMenu={initialMenu}
        />
      </section>
    </AdminShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="panel metric-card">
      <p className="eyebrow">{label}</p>
      <p className="metric-value text-stone-950">{value}</p>
    </section>
  );
}
