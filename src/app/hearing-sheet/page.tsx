import { HearingSheetPublicForm } from "@/components/hearing-sheet-public-form";
import { getHearingSheetByToken } from "@/lib/server/roomly-admin";

export const dynamic = "force-dynamic";

export default async function HearingSheetPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = resolvedSearchParams?.token?.trim();
  const data = token ? await getHearingSheetByToken(token) : null;

  if (!token || !data) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
        <section className="panel w-full p-8 md:p-10">
          <p className="eyebrow">Roomly Hearing Sheet</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-stone-950">
            リンクが無効です
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            ヒアリングシートURLが無効、または期限切れです。MOGCIA 担当者に再発行をご依頼ください。
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl px-4 py-8 md:px-6">
      <section className="panel w-full p-6 md:p-10">
        <p className="eyebrow">Roomly Hearing Sheet</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-stone-950">
          {data.hotel.name} ヒアリングシート
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
          ホテル運用に必要な基本情報をご入力ください。送信内容は Roomly Admin 側で管理され、
          AIチャットや運用設定の参照元として利用されます。
        </p>

        <div className="mt-8 grid gap-4 rounded-3xl bg-[var(--surface-muted)] p-5 md:grid-cols-3">
          <Meta label="ホテル名" value={data.hotel.name} />
          <Meta label="プラン" value={data.hotel.plan} />
          <Meta label="発行状態" value={data.link.status === "active" ? "有効" : data.link.status} />
        </div>

        <div className="mt-8">
          <HearingSheetPublicForm token={token} initialData={data.sheet} />
        </div>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-stone-900">{value}</p>
    </div>
  );
}
