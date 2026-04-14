import { AdminShell } from "@/components/admin-shell";
import { ContractsHotelCard } from "@/components/contracts-hotel-card";
import { SectionCard } from "@/components/ui";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import {
  getHearingSheetByHotelId,
  listHearingSheetSummaries,
  listHotels,
  listRooms,
  type HearingSheetData,
} from "@/lib/server/roomly-admin";
import { requireSuperAdminPageSession } from "@/lib/server/super-admin-auth";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  await requireSuperAdminPageSession();
  const configured = isFirebaseAdminConfigured();
  const [hotels, rooms, hearingSheetSummaries] = configured
    ? await Promise.all([listHotels(), listRooms(), listHearingSheetSummaries()])
    : [[], [], []];
  const hearingSheets = configured
    ? (
        await Promise.all(
          hearingSheetSummaries.map(async (summary) => ({
            hotelId: summary.hotelId,
            sheet: await getHearingSheetByHotelId(summary.hotelId),
          })),
        )
      ).filter((entry): entry is { hotelId: string; sheet: HearingSheetData } => Boolean(entry.sheet))
    : [];

  const roomCountByHotel = new Map<string, number>();
  const hearingSheetByHotelId = new Map(hearingSheets.map((entry) => [entry.hotelId, entry.sheet]));

  for (const room of rooms) {
    roomCountByHotel.set(room.hotelId, (roomCountByHotel.get(room.hotelId) ?? 0) + 1);
  }

  return (
    <AdminShell
      section="contracts"
      title="契約ホテル一覧"
      description="契約中ホテルをカードで管理します。未記入ホテルはクリックでURLを発行し、記入済みホテルはその場で編集できます。"
    >
      <div className="contracts-square px-2 md:px-3">
        {!configured ? (
          <section className="panel border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
            Firebase Admin が未設定です。<code>FIREBASE_ADMIN_PROJECT_ID</code>、
            <code>FIREBASE_ADMIN_CLIENT_EMAIL</code>、<code>FIREBASE_ADMIN_PRIVATE_KEY</code>
            を設定すると、この画面の発行APIと Firestore 読み込みが有効になります。
          </section>
        ) : null}

        <SectionCard
          title="契約ホテル"
          description="ホテルごとにURL発行とヒアリング編集を行います。"
          className="!rounded-none"
        >
          {hotels.length === 0 ? (
            <p className="text-sm leading-6 text-stone-500">まだホテルは登録されていません。</p>
          ) : (
            <div className="grid gap-4">
              {hotels.map((hotel) => (
                <ContractsHotelCard
                  key={hotel.id}
                  hotelId={hotel.id}
                  hotelName={hotel.name}
                  plan={hotel.plan}
                  hotelAdminEmail={hotel.hotelAdminEmail}
                  roomCount={roomCountByHotel.get(hotel.id) ?? 0}
                  hearingSheet={hearingSheetByHotelId.get(hotel.id)}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AdminShell>
  );
}
