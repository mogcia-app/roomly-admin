import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { SectionCard, StatusPill } from "@/components/ui";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import {
  getLatestHearingSheetLink,
  listActiveStays,
  listHearingSheetSummaries,
  listHotels,
  listRooms,
} from "@/lib/server/roomly-admin";
import { requireSuperAdminPageSession } from "@/lib/server/super-admin-auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireSuperAdminPageSession();
  const configured = isFirebaseAdminConfigured();
  const hasGuestRoomUrlBase = Boolean(process.env.GUEST_ROOM_URL_BASE?.trim());
  const [hotels, rooms, stays, hearingSheetSummaries] = configured
    ? await Promise.all([listHotels(), listRooms(), listActiveStays(), listHearingSheetSummaries()])
    : [[], [], [], []];
  const latestLinkEntries = configured
    ? await Promise.all(
        hotels.slice(0, 6).map(async (hotel) => ({
          hotel,
          link: await getLatestHearingSheetLink(hotel.id),
        })),
      )
    : [];

  const roomCountByHotel = new Map<string, number>();
  const hearingSheetHotelIds = new Set(hearingSheetSummaries.map((item) => item.hotelId));

  for (const room of rooms) {
    roomCountByHotel.set(room.hotelId, (roomCountByHotel.get(room.hotelId) ?? 0) + 1);
  }

  const hotelsMissingHearingSheet = hotels.filter((hotel) => !hearingSheetHotelIds.has(hotel.id));
  const hotelsMissingRooms = hotels.filter((hotel) => (roomCountByHotel.get(hotel.id) ?? 0) === 0);

  return (
    <AdminShell
      section="dashboard"
      title="運用ダッシュボード"
      description="トップページは全体状況の確認と、次に触るべき導線だけに絞ります。実作業はホテル導入ページへ集約し、ここでは進捗と抜け漏れを把握します。"
    >
      {!configured ? (
        <section className="panel border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          Firebase Admin が未設定です。<code>FIREBASE_ADMIN_PROJECT_ID</code>、
          <code>FIREBASE_ADMIN_CLIENT_EMAIL</code>、<code>FIREBASE_ADMIN_PRIVATE_KEY</code>
          を設定すると、この画面の発行APIと Firestore 読み込みが有効になります。
        </section>
      ) : null}

      {!hasGuestRoomUrlBase ? (
        <section className="panel border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          <code>GUEST_ROOM_URL_BASE</code> を設定すると、客室QRのゲスト遷移URLを生成できます。
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="契約ホテル数" value={String(hotels.length)} />
        <MetricCard label="送信済みヒアリング" value={String(hearingSheetSummaries.length)} />
        <MetricCard label="登録客室数" value={String(rooms.length)} />
        <MetricCard label="有効滞在数" value={String(stays.length)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard
          title="最短導線"
          description="新規ホテル対応でよく使う操作は、ホテル導入ページにまとめています。"
        >
          <div className="grid gap-3">
            <QuickLinkCard
              href="/hotels#accounts"
              label="アカウント発行"
              description="hotel_admin を作成して運用を開始します。"
            />
            <QuickLinkCard
              href="/hotels#hearing-sheet"
              label="ヒアリングシート"
              description="入力URL発行、送信内容の確認、管理画面からの編集を行います。"
            />
            <QuickLinkCard
              href="/hotels#rooms"
              label="客室とQR"
              description="客室登録、QR生成、PDF出力までをまとめて進めます。"
            />
            <QuickLinkCard
              href="/guest-rich-menus"
              label="Guest メニュー"
              description="ホテル別のリッチメニュー画像、タップ領域、アクションを管理します。"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="要確認"
          description="設定漏れや、次に対応すべきホテルを先に拾います。"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <ActionAlert
              title="ヒアリング未送信"
              count={hotelsMissingHearingSheet.length}
              href="/hotels#hearing-sheet"
              tone={hotelsMissingHearingSheet.length > 0 ? "warning" : "success"}
              detail={
                hotelsMissingHearingSheet.length > 0
                  ? hotelsMissingHearingSheet.slice(0, 3).map((hotel) => hotel.name).join(" / ")
                  : "全ホテルで送信済みです。"
              }
            />
            <ActionAlert
              title="客室未登録"
              count={hotelsMissingRooms.length}
              href="/hotels#rooms"
              tone={hotelsMissingRooms.length > 0 ? "warning" : "success"}
              detail={
                hotelsMissingRooms.length > 0
                  ? hotelsMissingRooms.slice(0, 3).map((hotel) => hotel.name).join(" / ")
                  : "全ホテルで客室登録済みです。"
              }
            />
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <SectionCard
          title="ホテル状況"
          description="主要ホテルだけ、導入状態を一覧で確認できます。"
        >
          <div className="space-y-3">
            {latestLinkEntries.length === 0 ? (
              <p className="text-sm leading-6 text-stone-500">まだホテルは登録されていません。</p>
            ) : (
              latestLinkEntries.map(({ hotel, link }) => {
                const hasRooms = (roomCountByHotel.get(hotel.id) ?? 0) > 0;
                const hasSheet = hearingSheetHotelIds.has(hotel.id);
                return (
                  <article key={hotel.id} className="status-list-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-950">{hotel.name}</p>
                        <p className="mt-1 font-mono text-xs text-stone-500">hotel_id: {hotel.id}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={hasSheet ? "success" : "warning"}>
                          {hasSheet ? "ヒアリング済み" : "ヒアリング待ち"}
                        </StatusPill>
                        <StatusPill tone={hasRooms ? "success" : "warning"}>
                          {hasRooms ? "客室登録済み" : "客室未登録"}
                        </StatusPill>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-600">
                      <span>客室数 {roomCountByHotel.get(hotel.id) ?? 0} 室</span>
                      <span>プラン {hotel.plan}</span>
                    </div>
                    {link ? (
                      <p className="mt-2 break-all text-xs leading-6 text-stone-500">{link.url}</p>
                    ) : (
                      <p className="mt-2 text-xs leading-6 text-stone-500">ヒアリングURL未発行</p>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="ページ別の使い分け"
          description="情報を見る場所と、実作業をする場所を分けています。"
        >
          <div className="space-y-3">
            <GuideRow
              href="/hotels"
              title="ホテル導入"
              body="アカウント付与、ヒアリングURL、ヒアリング編集、客室登録、QR/PDFをまとめて実行します。"
            />
            <GuideRow
              href="/operations"
              title="運用監視"
              body="リアルタイム運用、リスク、監視寄りの確認に使います。"
            />
            <GuideRow
              href="/guest-rich-menus"
              title="Guest リッチメニュー"
              body="ホテルごとの画像差し替え、タップ領域編集、並び順管理に使います。"
            />
            <GuideRow
              href="/architecture"
              title="設計"
              body="別プロジェクトへ渡す前提、固定データ構造、責務分離を確認します。"
            />
          </div>
        </SectionCard>
      </section>
    </AdminShell>
  );
}

function QuickLinkCard({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 transition hover:bg-white"
    >
      <p className="text-sm font-semibold text-stone-950">{label}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
    </Link>
  );
}

function ActionAlert({
  title,
  count,
  href,
  tone,
  detail,
}: {
  title: string;
  count: number;
  href: string;
  tone: "warning" | "success";
  detail: string;
}) {
  return (
    <Link href={href} className="border border-[var(--border)] bg-white px-4 py-4 transition hover:bg-stone-50">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-950">{title}</p>
        <StatusPill tone={tone}>{count} 件</StatusPill>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-600">{detail}</p>
    </Link>
  );
}

function GuideRow({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="block border border-[var(--border)] bg-white px-4 py-4 transition hover:bg-stone-50">
      <p className="text-sm font-semibold text-stone-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
    </Link>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel metric-card rounded-none">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-stone-950">{value}</p>
    </div>
  );
}
