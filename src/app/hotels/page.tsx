import { AdminShell } from "@/components/admin-shell";
import { HotelsWorkspace } from "@/components/hotels-workspace";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
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
      description="アカウント付与、ヒアリング回収、客室登録、QR配布、送信内容の更新まで完結できるページです。"
    >
      {!configured ? (
        <section className="panel border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          Firebase Admin が未設定です。<code>FIREBASE_ADMIN_PROJECT_ID</code>、
          <code>FIREBASE_ADMIN_CLIENT_EMAIL</code>、<code>FIREBASE_ADMIN_PRIVATE_KEY</code>
          を設定すると、この画面の発行APIと Firestore 読み込みが有効になります。
        </section>
      ) : null}

      <div className="px-2 md:px-3">
        <HotelsWorkspace
          hotels={hotelOptions}
          latestLinkEntries={latestLinkEntries.map(({ hotel, link }) => ({
            hotelId: hotel.id,
            hotelName: hotel.name,
            url: link?.url ?? null,
            createdAt: link?.createdAt ?? null,
          }))}
          roomQrReplacementAudits={roomQrReplacementAudits}
        />
      </div>
    </AdminShell>
  );
}
