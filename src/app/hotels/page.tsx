import { AdminShell } from "@/components/admin-shell";
import { ExpireStayButton } from "@/components/expire-stay-button";
import { HearingSheetLinkForm } from "@/components/hearing-sheet-link-form";
import { HotelAdminProvisionForm } from "@/components/hotel-admin-provision-form";
import { RoomCsvImportForm } from "@/components/room-csv-import-form";
import { RoomQrGenerationForm } from "@/components/room-qr-generation-form";
import { RoomQrPdfDownloadForm } from "@/components/room-qr-pdf-download-form";
import { StaysHotelFilter } from "@/components/stays-hotel-filter";
import { SuperAdminProvisionForm } from "@/components/super-admin-provision-form";
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

export default async function HotelsPage({
  searchParams,
}: {
  searchParams?: Promise<{ stayHotelId?: string }>;
}) {
  await requireSuperAdminPageSession();
  const configured = isFirebaseAdminConfigured();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const stayHotelId = resolvedSearchParams?.stayHotelId?.trim() || undefined;
  const hasGuestRoomUrlBase = Boolean(process.env.GUEST_ROOM_URL_BASE?.trim());
  const [hotels, rooms, stays, hearingSheetSummaries] = configured
    ? await Promise.all([
        listHotels(),
        listRooms(),
        listActiveStays(stayHotelId),
        listHearingSheetSummaries(),
      ])
    : [[], [], [], []];

  const roomCountByHotel = new Map<string, number>();
  const stayCountByHotel = new Map<string, number>();

  for (const room of rooms) {
    roomCountByHotel.set(room.hotelId, (roomCountByHotel.get(room.hotelId) ?? 0) + 1);
  }

  for (const stay of stays) {
    stayCountByHotel.set(stay.hotelId, (stayCountByHotel.get(stay.hotelId) ?? 0) + 1);
  }

  const latestLinkEntries = configured
    ? await Promise.all(
        hotels.slice(0, 6).map(async (hotel) => ({
          hotel,
          link: await getLatestHearingSheetLink(hotel.id),
        })),
      )
    : [];

  return (
    <AdminShell
      title="ホテル導入・発行管理"
      description="MOGCIA 側で hotel_admin の発行、客室マスタ登録、滞在状態の確認を行い、ホテル側アプリとゲスト側アプリの運用データを整える画面です。"
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
          ヒアリングシートURLはこの Admin のURLを使って自動発行されます。
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="hotel_admin 作成"
          description="ホテル担当者の初期アカウントを発行します。Firebase Auth、custom claims、hotels/users をまとめて作成します。"
        >
          <HotelAdminProvisionForm />
        </SectionCard>

        <SectionCard
          title="客室CSV取り込み"
          description="客室台帳CSVを rooms に一括登録します。重複する room_number は取り込み時に拒否します。"
        >
          <RoomCsvImportForm hotels={hotels.map((hotel) => ({ id: hotel.id, name: hotel.name }))} />
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="ヒアリングシートURL発行"
          description="ホテル担当者が入力するヒアリングシートURLを発行します。"
        >
          <HearingSheetLinkForm hotels={hotels.map((hotel) => ({ id: hotel.id, name: hotel.name }))} />
        </SectionCard>

        <SectionCard
          title="客室QR一括生成"
          description="各部屋のゲスト用URLに遷移する固定QRを、部屋数分まとめて生成します。"
        >
          <RoomQrGenerationForm hotels={hotels.map((hotel) => ({ id: hotel.id, name: hotel.name }))} />
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="客室QR PDF 出力"
          description="A4レイアウトの客室QR PDF をダウンロードします。印刷・郵送・持参用の配布資料として使えます。"
        >
          <RoomQrPdfDownloadForm hotels={hotels.map((hotel) => ({ id: hotel.id, name: hotel.name }))} />
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="発行済みヒアリングシートURL"
          description="各ホテルに直近で発行した入力URLです。"
        >
          <div className="space-y-3">
            {latestLinkEntries.length === 0 ? (
              <p className="text-sm leading-6 text-stone-500">まだ発行履歴はありません。</p>
            ) : (
              latestLinkEntries.map(({ hotel, link }) => (
                <article
                  key={hotel.id}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"
                >
                  <p className="text-sm font-semibold text-stone-950">{hotel.name}</p>
                  {link ? (
                    <>
                      <p className="mt-2 break-all text-xs leading-6 text-stone-600">{link.url}</p>
                      <p className="mt-2 text-xs text-stone-500">
                        発行日時 {link.createdAt ? new Date(link.createdAt).toLocaleString() : "不明"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-stone-500">未発行</p>
                  )}
                </article>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="送信済みヒアリングシート"
          description="ホテルから送信された最新内容の一覧です。"
        >
          <div className="space-y-3">
            {hearingSheetSummaries.length === 0 ? (
              <p className="text-sm leading-6 text-stone-500">まだ送信データはありません。</p>
            ) : (
              hearingSheetSummaries.slice(0, 8).map((summary) => (
                <article
                  key={summary.hotelId}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-950">{summary.hotelName}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {summary.contactName || "担当者未入力"}
                        {summary.contactEmail ? ` / ${summary.contactEmail}` : ""}
                      </p>
                    </div>
                    <StatusPill tone="success">送信済み</StatusPill>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-stone-600">
                    最終更新 {summary.updatedAt ? new Date(summary.updatedAt).toLocaleString() : "不明"}
                  </p>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="super_admin 作成"
          description="MOGCIA 運用担当者の管理アカウントを作成し、super_admin claim を付与します。"
        >
          <SuperAdminProvisionForm />
        </SectionCard>

        <SectionCard
          title="接続中コレクション"
          description="現在参照している主要コレクションの件数です。"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="ホテル数" value={String(hotels.length)} />
            <MetricCard label="客室数" value={String(rooms.length)} />
            <MetricCard label="有効滞在数" value={String(stays.length)} />
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="ホテル一覧"
          description="契約ホテルごとの基本情報、客室登録数、現在の滞在件数を確認します。"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-stone-500">
                  <th className="px-4">ホテル</th>
                  <th className="px-4">プラン</th>
                  <th className="px-4">管理者メール</th>
                  <th className="px-4">登録客室数</th>
                  <th className="px-4">現在滞在中</th>
                  <th className="px-4">登録日時</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((hotel) => (
                  <tr key={hotel.id} className="rounded-3xl bg-[var(--surface-muted)] text-sm">
                    <td className="rounded-l-3xl px-4 py-4">
                      <p className="font-semibold text-stone-950">{hotel.name}</p>
                      <p className="mt-1 font-mono text-xs text-stone-500">hotel_id: {hotel.id}</p>
                    </td>
                    <td className="px-4 py-4 text-stone-700">{hotel.plan}</td>
                    <td className="px-4 py-4 text-stone-700">
                      {hotel.hotelAdminEmail ?? "メール未登録"}
                    </td>
                    <td className="px-4 py-4 text-stone-700">
                      {roomCountByHotel.get(hotel.id) ?? 0}
                    </td>
                    <td className="px-4 py-4 text-stone-700">
                      {stayCountByHotel.get(hotel.id) ?? 0}
                    </td>
                    <td className="rounded-r-3xl px-4 py-4 text-stone-700">
                      {hotel.createdAt ? new Date(hotel.createdAt).toLocaleString() : "不明"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="有効な滞在一覧"
          description="現在滞在中のゲストセッションを確認し、必要に応じて手動で失効できます。"
        >
          <div className="mb-4">
            <StaysHotelFilter
              hotels={hotels.map((hotel) => ({ id: hotel.id, name: hotel.name }))}
              selectedHotelId={stayHotelId}
            />
          </div>
          <div className="space-y-3">
            {stays.length === 0 ? (
              <p className="text-sm leading-6 text-stone-500">有効な滞在はありません。</p>
            ) : (
              stays.slice(0, 8).map((stay) => (
                <article
                  key={stay.id}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-950">
                        客室 {stay.roomNumber ?? stay.roomId}
                        {stay.roomDisplayName ? ` (${stay.roomDisplayName})` : ""}
                      </p>
                      <p className="mt-1 font-mono text-xs text-stone-500">hotel_id: {stay.hotelId}</p>
                    </div>
                    <StatusPill tone={stay.isActive ? "success" : "neutral"}>
                      {stay.isActive ? "有効" : "無効"}
                    </StatusPill>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    {stay.language ? `${stay.language} / ` : ""}
                    チェックアウト {stay.checkOut ? new Date(stay.checkOut).toLocaleString() : "不明"}
                  </p>
                  <ExpireStayButton stayId={stay.id} />
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>
    </AdminShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-stone-950">{value}</p>
    </div>
  );
}
