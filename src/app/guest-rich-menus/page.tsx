import { AdminShell } from "@/components/admin-shell";
import { GuestRichMenuEditor } from "@/components/guest-rich-menu-editor";
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

  return (
    <AdminShell
      section="guest-rich-menus"
      title="Guest リッチメニュー"
      description="ホテルごとに、ゲスト画面へ出すリッチメニューの背景画像・ボタン位置・ボタンを押した後の動作を設定するページです。保存した内容は guest 側表示に使われます。"
    >
      {!configured ? (
        <section className="panel border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
          Firebase Admin が未設定です。Firestore と Storage を有効にすると guest rich menu を保存できます。
        </section>
      ) : null}

      <GuestRichMenuEditor
        hotels={hotels.map((hotel) => ({ id: hotel.id, name: hotel.name }))}
        initialHotelId={initialHotelId}
        initialMenu={initialMenu}
      />
    </AdminShell>
  );
}
