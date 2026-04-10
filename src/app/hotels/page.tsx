import { AdminShell } from "@/components/admin-shell";
import { HearingSheetLinkForm } from "@/components/hearing-sheet-link-form";
import { HotelAdminProvisionForm } from "@/components/hotel-admin-provision-form";
import { RoomCountSetupForm } from "@/components/room-count-setup-form";
import { RoomQrGenerationForm } from "@/components/room-qr-generation-form";
import { RoomQrPdfDownloadForm } from "@/components/room-qr-pdf-download-form";
import { SectionCard } from "@/components/ui";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { getGuestRoomUrlBase } from "@/lib/server/roomly-links";
import {
  getLatestHearingSheetLink,
  listHotels,
  listRoomQrReplacementAudits,
} from "@/lib/server/roomly-admin";
import { requireSuperAdminPageSession } from "@/lib/server/super-admin-auth";

export const dynamic = "force-dynamic";

export default async function HotelsPage() {
  await requireSuperAdminPageSession();
  const configured = isFirebaseAdminConfigured();
  const guestRoomUrlBase = getGuestRoomUrlBase();
  const hotels = configured ? await listHotels() : [];
  const roomQrReplacementAudits = configured ? await listRoomQrReplacementAudits() : [];

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

      <section className="panel border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
        客室QRの運用用URLは常に <code>{guestRoomUrlBase}</code> を使用します。Vercel の preview / 直URL は
        運用用QRには使いません。ヒアリングシートURLはこの Admin のURLを使って自動発行されます。
      </section>

      <section id="accounts" className="grid scroll-mt-24 gap-6">
        <SectionCard
          title="アカウント発行"
          description="ホテル担当者と MOGCIA 運用担当の初期アカウントを作成します。"
        >
          <div className="grid gap-6">
            <div className="border border-[var(--border)] bg-white p-4">
              <p className="text-sm font-semibold text-stone-950">hotel_admin 作成</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Firebase Auth、custom claims、hotels/users をまとめて作成します。
              </p>
              <div className="mt-4">
                <HotelAdminProvisionForm />
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section id="hearing-sheet" className="grid scroll-mt-24 gap-6">
        <SectionCard
          title="ヒアリングシート運用"
          description="ホテル担当者へ送る入力URLを発行します。送信済みデータの確認と編集は契約ホテル一覧ページで行います。"
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
      </section>

      <section id="rooms" className="grid scroll-mt-24 gap-6 xl:grid-cols-2">
        <SectionCard
          title="階数ごとに客室を作成"
          description="ホテルを選び、1F〜50F の各階に何部屋あるかを入れると、階数ベースの部屋番号で一括作成します。"
        >
          <RoomCountSetupForm hotels={hotelOptions} />
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

        <SectionCard
          title="掲示済みQR差し替え確認"
          description="既存の掲示済みQRが roomly.chat 以外を向いていないかを確認します。差し替え対象があるホテルだけ表示します。"
        >
          {roomQrReplacementAudits.length === 0 ? (
            <p className="text-sm leading-6 text-stone-600">
              現在の発行済みQRに、差し替えが必要な別ドメインは見つかりませんでした。
            </p>
          ) : (
            <div className="space-y-4">
              {roomQrReplacementAudits.map((audit) => (
                <article key={audit.hotelId} className="border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-stone-950">{audit.hotelName}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">
                    {audit.totalQrs} 室中 {audit.mismatchedCount} 室が <code>{audit.targetHost}</code> 以外を向いています。
                  </p>
                  <div className="mt-3 space-y-2">
                    {audit.mismatchedRooms.slice(0, 8).map((room) => (
                      <div key={room.roomId} className="border border-amber-200 bg-white p-3 text-xs leading-6 text-stone-700">
                        <p>
                          Room {room.roomNumber} / 現在ドメイン: <code>{room.guestUrlHost}</code>
                        </p>
                        <p className="break-all text-stone-500">{room.guestUrl}</p>
                      </div>
                    ))}
                    {audit.mismatchedRooms.length > 8 ? (
                      <p className="text-xs text-stone-500">
                        他 {audit.mismatchedRooms.length - 8} 室も差し替え対象です。
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </AdminShell>
  );
}
