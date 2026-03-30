import { AdminShell } from "@/components/admin-shell";
import { HearingSheetLinkForm } from "@/components/hearing-sheet-link-form";
import { HotelAdminProvisionForm } from "@/components/hotel-admin-provision-form";
import { RoomCountSetupForm } from "@/components/room-count-setup-form";
import { RoomQrGenerationForm } from "@/components/room-qr-generation-form";
import { RoomQrPdfDownloadForm } from "@/components/room-qr-pdf-download-form";
import { SectionCard, StatusPill } from "@/components/ui";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { getLatestHearingSheetLink, listHotels, listRooms } from "@/lib/server/roomly-admin";
import { requireSuperAdminPageSession } from "@/lib/server/super-admin-auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireSuperAdminPageSession();
  const configured = isFirebaseAdminConfigured();
  const hasGuestRoomUrlBase = Boolean(process.env.GUEST_ROOM_URL_BASE?.trim());
  const hotels = configured ? await listHotels() : [];
  const rooms = configured ? await listRooms() : [];
  const latestLinkEntries = configured
    ? await Promise.all(
        hotels.slice(0, 6).map(async (hotel) => ({
          hotel,
          link: await getLatestHearingSheetLink(hotel.id),
        })),
      )
    : [];
  const hotelOptions = hotels.map((hotel) => ({ id: hotel.id, name: hotel.name }));
  const roomCountByHotel = new Map<string, number>();

  for (const room of rooms) {
    roomCountByHotel.set(room.hotelId, (roomCountByHotel.get(room.hotelId) ?? 0) + 1);
  }

  return (
    <AdminShell
      title="導入の最短フロー"
      description="メインページは、ホテル導入に必要な最小操作だけに絞っています。アカウント付与、ヒアリングシートURL発行、部屋数登録、QR生成、PDF保存をこの順番で進めます。"
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

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="1. アカウント付与"
          description="hotel_admin を作成して、ホテルごとの運用を開始します。"
        >
          <HotelAdminProvisionForm />
        </SectionCard>

        <SectionCard
          title="2. ヒアリングシートURL"
          description="ホテル担当者に送る入力URLを発行します。"
        >
          <HearingSheetLinkForm hotels={hotelOptions} />
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="3. 部屋数選択"
          description="最小運用向けに、部屋数だけ指定して客室を一括作成します。"
        >
          <RoomCountSetupForm hotels={hotelOptions} />
        </SectionCard>

        <SectionCard
          title="4. QRコード生成"
          description="登録した部屋数分のゲスト用QRを一括生成します。"
        >
          <RoomQrGenerationForm hotels={hotelOptions} />
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="5. PDFで保存"
          description="印刷・共有用に客室QRのPDFを保存します。"
        >
          <RoomQrPdfDownloadForm hotels={hotelOptions} />
        </SectionCard>

        <SectionCard
          title="現在の状態"
          description="直近で使うホテルだけ、導入進捗を素早く確認できます。"
        >
          <div className="space-y-3">
            {latestLinkEntries.length === 0 ? (
              <p className="text-sm leading-6 text-stone-500">まだホテルは登録されていません。</p>
            ) : (
              latestLinkEntries.map(({ hotel, link }) => (
                <article
                  key={hotel.id}
                  className="status-list-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-950">{hotel.name}</p>
                      <p className="mt-1 font-mono text-xs text-stone-500">hotel_id: {hotel.id}</p>
                    </div>
                    <StatusPill tone={(roomCountByHotel.get(hotel.id) ?? 0) > 0 ? "success" : "warning"}>
                      {(roomCountByHotel.get(hotel.id) ?? 0) > 0 ? "部屋登録済み" : "部屋未登録"}
                    </StatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-600">
                    <span>客室数 {(roomCountByHotel.get(hotel.id) ?? 0)} 室</span>
                    <span>ヒアリング {link ? "発行済み" : "未発行"}</span>
                  </div>
                  {link ? (
                    <p className="mt-2 break-all text-xs leading-6 text-stone-500">{link.url}</p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </section>
    </AdminShell>
  );
}
