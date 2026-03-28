import { AdminShell } from "@/components/admin-shell";
import { SectionCard, StatusPill } from "@/components/ui";
import {
  callQueue,
  kpiCards,
  onboardingChecklist,
  pipelineStages,
  responsibilities,
  roadmap,
} from "@/lib/admin-data";
import { requireSuperAdminPageSession } from "@/lib/server/super-admin-auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requireSuperAdminPageSession();
  return (
    <AdminShell
      currentPath="/"
      title="Roomly MVP 管制画面"
      description="このプロジェクトは MOGCIA 側の管理面を担当します。ホテルアカウント発行、客室QR運用、AI基盤、リアルタイム通話基盤、運用監視をまとめて扱います。"
      sessionEmail={session.email}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="panel p-6">
            <p className="eyebrow">{card.label}</p>
            <p className="metric-value mt-4">{card.value}</p>
            <p className="mt-4 text-sm leading-6 text-stone-600">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="MOGCIA の担当範囲"
          description="ホテル側アプリとゲスト側アプリは別プロジェクトです。この管理画面では、MVP前に固定すべきバックエンドと運用の責務を扱います。"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {responsibilities.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5"
              >
                <h4 className="text-base font-semibold text-stone-950">{item.title}</h4>
                <p className="mt-3 text-sm leading-6 text-stone-600">{item.body}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="ホテル導入チェックリスト"
          description="MVP の手動運用で、super_admin が各ホテル導入時に必ず実施する作業です。"
        >
          <ol className="space-y-3">
            {onboardingChecklist.map((item, index) => (
              <li
                key={item}
                className="flex gap-4 rounded-3xl border border-[var(--border)] px-4 py-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm leading-6 text-stone-700">{item}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="AI・リアルタイム基盤"
          description="バックエンドと通信インフラの責務整理です。"
        >
          <div className="space-y-4">
            {pipelineStages.map((stage) => (
              <div
                key={stage.name}
                className="rounded-3xl border border-[var(--border)] bg-white px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-stone-950">{stage.name}</h4>
                    <p className="mt-1 text-sm text-stone-500">{stage.owner}</p>
                  </div>
                  <StatusPill
                    tone={
                      stage.status === "ready"
                        ? "success"
                        : stage.status === "in_progress"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {stage.status === "ready"
                      ? "対応済み"
                      : stage.status === "in_progress"
                        ? "対応中"
                        : "予定"}
                  </StatusPill>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-600">{stage.description}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="フロント着信キューの想定状態"
          description="着信キュー制御、緊急通知、チャットへのフォールバックを想定した状態例です。"
        >
          <div className="space-y-4">
            {callQueue.map((item) => (
              <div
                key={`${item.hotel}-${item.roomId}`}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-stone-950">
                      {item.hotel} / Room {item.roomNumber}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">{item.guestLanguage}</p>
                  </div>
                  <StatusPill tone={item.priority === "high" ? "danger" : "neutral"}>
                    {item.priority === "high" ? "緊急" : "通常"}
                  </StatusPill>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-600">{item.waitingFor}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="開発の進め方"
        description="プロジェクト分割と固定方針を踏まえた実装順です。"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {roadmap.map((item) => (
            <article
              key={item.phase}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5"
            >
              <p className="eyebrow">{item.phase}</p>
              <p className="mt-3 text-base font-semibold text-stone-950">{item.focus}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </AdminShell>
  );
}
