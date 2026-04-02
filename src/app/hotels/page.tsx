import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { ExpireStayButton } from "@/components/expire-stay-button";
import { HearingSheetAdminEditor } from "@/components/hearing-sheet-admin-editor";
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
  getHearingSheetByHotelId,
  listActiveStays,
  listHearingSheetSummaries,
  listHotels,
  listRooms,
  type HearingSheetData,
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
  const hearingSheets = configured
    ? (
        await Promise.all(
          hearingSheetSummaries.map(async (summary) => ({
            summary,
            sheet: await getHearingSheetByHotelId(summary.hotelId),
          })),
        )
      ).filter((entry): entry is { summary: (typeof hearingSheetSummaries)[number]; sheet: HearingSheetData } =>
        Boolean(entry.sheet),
      )
    : [];

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

  const hotelOptions = hotels.map((hotel) => ({ id: hotel.id, name: hotel.name }));

  return (
    <AdminShell
      section="hotels"
      title="ホテル導入"
      description="このページは、ホテル単位の導入作業に絞ります。上から順に進めれば、アカウント付与、ヒアリング回収、客室登録、QR配布、送信内容の更新まで完結します。"
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

      <section className="grid gap-4 lg:grid-cols-4">
        <AnchorLinkCard
          href="#accounts"
          title="1. アカウント"
          body="hotel_admin と super_admin の発行"
        />
        <AnchorLinkCard
          href="#hearing-sheet"
          title="2. ヒアリング"
          body="URL発行、送信内容の確認、管理画面編集"
        />
        <AnchorLinkCard
          href="#rooms"
          title="3. 客室とQR"
          body="客室登録、QR生成、PDF出力"
        />
        <AnchorLinkCard
          href="#ledger"
          title="4. 台帳と滞在"
          body="ホテル一覧と有効滞在の確認"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="ホテル数" value={String(hotels.length)} />
        <MetricCard label="送信済みヒアリング" value={String(hearingSheets.length)} />
        <MetricCard label="登録客室数" value={String(rooms.length)} />
        <MetricCard label="有効滞在数" value={String(stays.length)} />
      </section>

      <section id="accounts" className="grid scroll-mt-24 gap-6 xl:grid-cols-[1fr_0.8fr]">
        <SectionCard
          title="アカウント発行"
          description="ホテル担当者と MOGCIA 運用担当の初期アカウントを作成します。"
        >
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="border border-[var(--border)] bg-white p-4">
              <p className="text-sm font-semibold text-stone-950">hotel_admin 作成</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Firebase Auth、custom claims、hotels/users をまとめて作成します。
              </p>
              <div className="mt-4">
                <HotelAdminProvisionForm />
              </div>
            </div>
            <div className="border border-[var(--border)] bg-white p-4">
              <p className="text-sm font-semibold text-stone-950">super_admin 作成</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                MOGCIA 運用担当者の管理アカウントを発行します。
              </p>
              <div className="mt-4">
                <SuperAdminProvisionForm />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="最新の発行状態"
          description="導入初期で確認しやすい状態だけ先に見せます。"
        >
          <div className="space-y-3">
            {latestLinkEntries.length === 0 ? (
              <p className="text-sm leading-6 text-stone-500">まだ発行履歴はありません。</p>
            ) : (
              latestLinkEntries.map(({ hotel, link }) => (
                <article key={hotel.id} className="border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-950">{hotel.name}</p>
                      <p className="mt-1 text-xs text-stone-500">{hotel.hotelAdminEmail ?? "メール未登録"}</p>
                    </div>
                    <StatusPill tone={link ? "success" : "warning"}>{link ? "URL発行済み" : "未発行"}</StatusPill>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-stone-600">
                    客室数 {roomCountByHotel.get(hotel.id) ?? 0} / 現在滞在 {stayCountByHotel.get(hotel.id) ?? 0}
                  </p>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <section id="hearing-sheet" className="grid scroll-mt-24 gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <SectionCard
          title="ヒアリングシート運用"
          description="まずURLを発行し、送信後はこのページで内容を確認・編集します。"
        >
          <div className="space-y-6">
            <div className="border border-[var(--border)] bg-white p-4">
              <p className="text-sm font-semibold text-stone-950">入力URL発行</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                ホテル担当者へ送る公開入力URLを発行します。
              </p>
              <div className="mt-4">
                <HearingSheetLinkForm hotels={hotelOptions} />
              </div>
            </div>
            <div className="border border-[var(--border)] bg-white p-4">
              <p className="text-sm font-semibold text-stone-950">最近発行したURL</p>
              <div className="mt-4 space-y-3">
                {latestLinkEntries.length === 0 ? (
                  <p className="text-sm leading-6 text-stone-500">まだ発行履歴はありません。</p>
                ) : (
                  latestLinkEntries.map(({ hotel, link }) => (
                    <article key={`link-${hotel.id}`} className="border border-[var(--border)] bg-stone-50 p-3">
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
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="送信済みヒアリングシート"
          description="ホテルから送信された内容を確認し、必要なら super_admin がその場で編集します。"
        >
          <div className="space-y-4">
            {hearingSheets.length === 0 ? (
              <p className="text-sm leading-6 text-stone-500">まだ送信データはありません。</p>
            ) : (
              hearingSheets.slice(0, 8).map(({ summary, sheet }) => (
                <article key={summary.hotelId} className="border border-[var(--border)] bg-[var(--surface-muted)] p-4">
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
                  <div className="mt-4 grid gap-3">
                    <DetailGrid
                      items={[
                        ["フロント対応", sheet.frontDeskHours],
                        ["Wi-Fi件数", countLabel(sheet.wifiNetworks.length, "件")],
                        ["朝食件数", countLabel(sheet.breakfastEntries.length, "件")],
                        ["温泉件数", countLabel(sheet.bathEntries.length, "件")],
                        ["FAQ件数", countLabel(sheet.faqEntries.length, "件")],
                        ["周辺施設件数", countLabel(sheet.nearbySpotEntries.length, "件")],
                      ]}
                    />
                    <DetailSection title="Wi-Fi">
                      {sheet.wifiNetworks.length > 0 ? (
                        sheet.wifiNetworks.map((entry, index) => (
                          <DetailRow
                            key={`wifi-${summary.hotelId}-${index}`}
                            title={entry.floor || `Wi-Fi ${index + 1}`}
                            body={[entry.ssid, entry.password && `PW ${entry.password}`, formatNotes(entry.notes)]
                              .filter(Boolean)
                              .join(" / ")}
                          />
                        ))
                      ) : (
                        <EmptyText />
                      )}
                    </DetailSection>
                    <DetailSection title="館内設備・場所">
                      {sheet.facilityEntries.length > 0 || sheet.facilityLocationEntries.length > 0 ? (
                        <>
                          {sheet.facilityEntries.map((entry, index) => (
                            <DetailRow
                              key={`facility-${summary.hotelId}-${index}`}
                              title={entry.name || `設備 ${index + 1}`}
                              body={[entry.hours, formatNotes(entry.notes)].filter(Boolean).join(" / ")}
                            />
                          ))}
                          {sheet.facilityLocationEntries.map((entry, index) => (
                            <DetailRow
                              key={`facility-location-${summary.hotelId}-${index}`}
                              title={entry.name || `場所 ${index + 1}`}
                              body={[entry.floor, formatNotes(entry.notes)].filter(Boolean).join(" / ")}
                            />
                          ))}
                        </>
                      ) : (
                        <EmptyText />
                      )}
                    </DetailSection>
                    <DetailSection title="FAQ・チェックアウト">
                      {sheet.faqEntries.length > 0 || sheet.checkoutEntries.length > 0 ? (
                        <>
                          {sheet.faqEntries.slice(0, 3).map((entry, index) => (
                            <DetailRow
                              key={`faq-${summary.hotelId}-${index}`}
                              title={entry.question || `FAQ ${index + 1}`}
                              body={entry.answer}
                            />
                          ))}
                          {sheet.checkoutEntries.map((entry, index) => (
                            <DetailRow
                              key={`checkout-${summary.hotelId}-${index}`}
                              title={`チェックアウト ${index + 1}`}
                              body={[
                                entry.time && `時間 ${entry.time}`,
                                entry.method,
                                entry.keyReturnLocation && `鍵返却 ${entry.keyReturnLocation}`,
                                entry.lateCheckoutPolicy,
                                formatNotes(entry.notes),
                              ]
                                .filter(Boolean)
                                .join(" / ")}
                            />
                          ))}
                        </>
                      ) : (
                        <EmptyText />
                      )}
                    </DetailSection>
                    <DetailSection title="交通・周辺施設">
                      {sheet.transportEntries.length > 0 || sheet.nearbySpotEntries.length > 0 ? (
                        <>
                          {sheet.transportEntries.map((entry, index) => (
                            <DetailRow
                              key={`transport-${summary.hotelId}-${index}`}
                              title={entry.companyName || `交通 ${index + 1}`}
                              body={[entry.serviceType, entry.phone, entry.hours, entry.priceNote, formatNotes(entry.notes)]
                                .filter(Boolean)
                                .join(" / ")}
                            />
                          ))}
                          {sheet.nearbySpotEntries.map((entry, index) => (
                            <DetailRow
                              key={`nearby-${summary.hotelId}-${index}`}
                              title={entry.name || `周辺施設 ${index + 1}`}
                              body={[entry.category, entry.distance, entry.hours, entry.location, formatNotes(entry.notes)]
                                .filter(Boolean)
                                .join(" / ")}
                            />
                          ))}
                        </>
                      ) : (
                        <EmptyText />
                      )}
                    </DetailSection>
                  </div>
                  <HearingSheetAdminEditor hotelId={summary.hotelId} initialData={sheet} />
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <section id="rooms" className="grid scroll-mt-24 gap-6 xl:grid-cols-3">
        <SectionCard
          title="客室CSV取り込み"
          description="客室台帳CSVを rooms に一括登録します。重複する room_number は取り込み時に拒否します。"
        >
          <RoomCsvImportForm hotels={hotelOptions} />
        </SectionCard>

        <SectionCard
          title="客室QR一括生成"
          description="各部屋のゲスト用URLに遷移する固定QRを、部屋数分まとめて生成します。"
        >
          <RoomQrGenerationForm hotels={hotelOptions} />
        </SectionCard>

        <SectionCard
          title="客室QR PDF 出力"
          description="A4レイアウトの客室QR PDF をダウンロードします。印刷・共有に使います。"
        >
          <RoomQrPdfDownloadForm hotels={hotelOptions} />
        </SectionCard>
      </section>

      <section id="ledger" className="grid scroll-mt-24 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="ホテル台帳"
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
                  <tr key={hotel.id} className="bg-[var(--surface-muted)] text-sm">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-stone-950">{hotel.name}</p>
                      <p className="mt-1 font-mono text-xs text-stone-500">hotel_id: {hotel.id}</p>
                    </td>
                    <td className="px-4 py-4 text-stone-700">{hotel.plan}</td>
                    <td className="px-4 py-4 text-stone-700">{hotel.hotelAdminEmail ?? "メール未登録"}</td>
                    <td className="px-4 py-4 text-stone-700">{roomCountByHotel.get(hotel.id) ?? 0}</td>
                    <td className="px-4 py-4 text-stone-700">{stayCountByHotel.get(hotel.id) ?? 0}</td>
                    <td className="px-4 py-4 text-stone-700">
                      {hotel.createdAt ? new Date(hotel.createdAt).toLocaleString() : "不明"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="有効な滞在"
          description="現在滞在中のゲストセッションを確認し、必要に応じて手動で失効できます。"
        >
          <div className="mb-4">
            <StaysHotelFilter hotels={hotelOptions} selectedHotelId={stayHotelId} />
          </div>
          <div className="space-y-3">
            {stays.length === 0 ? (
              <p className="text-sm leading-6 text-stone-500">有効な滞在はありません。</p>
            ) : (
              stays.slice(0, 8).map((stay) => (
                <article key={stay.id} className="border border-[var(--border)] bg-[var(--surface-muted)] p-4">
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
          <div className="mt-4">
            <Link href="/operations" className="text-sm text-stone-600 underline underline-offset-4">
              運用監視ページも見る
            </Link>
          </div>
        </SectionCard>
      </section>
    </AdminShell>
  );
}

function AnchorLinkCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <a href={href} className="border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 transition hover:bg-white">
      <p className="text-sm font-semibold text-stone-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
    </a>
  );
}

function countLabel(value: number, suffix: string) {
  return `${value}${suffix}`;
}

function formatNotes(notes: Array<{ label: string; content: string }>) {
  return notes
    .map((note) => [note.label, note.content].filter(Boolean).join(": "))
    .filter(Boolean)
    .join(" / ");
}

function DetailGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="border border-white/70 bg-white px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">{label}</p>
          <p className="mt-1 text-sm font-medium text-stone-900">{value || "未入力"}</p>
        </div>
      ))}
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-white/70 bg-white p-3">
      <p className="text-xs font-semibold tracking-[0.12em] text-stone-500">{title}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function DetailRow({ title, body }: { title: string; body?: string }) {
  return (
    <div className="border border-stone-200 bg-white px-3 py-2.5">
      <p className="text-sm font-medium text-stone-900">{title}</p>
      <p className="mt-1 text-xs leading-6 text-stone-600">{body || "未入力"}</p>
    </div>
  );
}

function EmptyText() {
  return <p className="text-xs leading-6 text-stone-500">未入力</p>;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-4 py-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-stone-950">{value}</p>
    </div>
  );
}
