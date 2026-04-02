import { AdminShell } from "@/components/admin-shell";
import { SectionCard, StatusPill } from "@/components/ui";
import { callQueue, pipelineStages } from "@/lib/admin-data";
import { requireSuperAdminPageSession } from "@/lib/server/super-admin-auth";

export const dynamic = "force-dynamic";

const riskControls = [
  {
    risk: "Translation lag exceeds target",
    mitigation: "Show interpreting indicator, preserve chat fallback, and monitor stage latency.",
  },
  {
    risk: "STT confidence drops in noisy rooms",
    mitigation: "Use Whisper confidence thresholds and redirect to chat when confidence is low.",
  },
  {
    risk: "WebRTC call fails",
    mitigation: "Queue retry once, then surface chat handoff and front-side notification.",
  },
  {
    risk: "stay expiry misses checkout cutoff",
    mitigation: "Cron job plus API-time expiry guard and alerting on stale active stays.",
  },
] as const;

export default async function OperationsPage() {
  await requireSuperAdminPageSession();
  return (
    <AdminShell
      section="operations"
      title="運用監視"
      description="ゲスト側・ホテル側アプリの裏側にあるバックエンド、AI基盤、リアルタイムキュー制御、滞在失効、各種アラートを監視する画面です。"
    >
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="パイプライン責務"
          description="このプロジェクトで実装・監視すべきバックエンドサービスです。"
        >
          <div className="space-y-4">
            {pipelineStages.map((stage) => (
              <article
                key={stage.name}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-stone-950">{stage.name}</p>
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
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="リアルタイムキューと通知"
          description="フロントPWAの着信キューと緊急通知の状態例です。"
        >
          <div className="space-y-4">
            {callQueue.map((item) => (
              <article
                key={`${item.roomId}-${item.waitingFor}`}
                className="rounded-3xl border border-[var(--border)] px-5 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-stone-950">
                      {item.hotel} / Room {item.roomNumber}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">{item.guestLanguage}</p>
                  </div>
                  <StatusPill tone={item.priority === "high" ? "danger" : "warning"}>
                    {item.priority === "high" ? "緊急" : "通常"}
                  </StatusPill>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-600">{item.waitingFor}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="リスク対策"
        description="今のプロダクト方針から必要になる MOGCIA 側の対策です。"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {riskControls.map((item) => (
            <article
              key={item.risk}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5"
            >
              <p className="text-base font-semibold text-stone-950">{item.risk}</p>
              <p className="mt-3 text-sm leading-6 text-stone-600">{item.mitigation}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </AdminShell>
  );
}
