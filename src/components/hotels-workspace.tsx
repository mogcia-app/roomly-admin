"use client";

import { useState } from "react";

import { HearingSheetLinkForm } from "@/components/hearing-sheet-link-form";
import { HotelAdminProvisionForm } from "@/components/hotel-admin-provision-form";
import { RoomCountSetupForm } from "@/components/room-count-setup-form";
import { RoomQrWorkflowForm } from "@/components/room-qr-workflow-form";
import { TrialHotelProvisionForm } from "@/components/trial-hotel-provision-form";
import { SectionCard } from "@/components/ui";

type HotelOption = {
  id: string;
  name: string;
};

type LatestLinkEntry = {
  hotelId: string;
  hotelName: string;
  url: string | null;
  createdAt: string | number | null;
};

type RoomQrReplacementAudit = {
  hotelId: string;
  hotelName: string;
  totalQrs: number;
  mismatchedCount: number;
  targetHost: string;
  mismatchedRooms: Array<{
    roomId: string;
    roomNumber: string;
    guestUrlHost: string;
    guestUrl: string;
  }>;
};

function formatTimestamp(value: string | number | null) {
  if (!value) {
    return "不明";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "不明";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function HotelsWorkspace({
  hotels,
  latestLinkEntries,
  roomQrReplacementAudits,
}: {
  hotels: HotelOption[];
  latestLinkEntries: LatestLinkEntry[];
  roomQrReplacementAudits: RoomQrReplacementAudit[];
}) {
  const [hotelOptions, setHotelOptions] = useState(hotels);
  const [selectedHotelId, setSelectedHotelId] = useState(hotels[0]?.id ?? "");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isHotelPickerOpen, setIsHotelPickerOpen] = useState(false);
  const [isRecentLinksOpen, setIsRecentLinksOpen] = useState(false);
  const selectedHotel = hotelOptions.find((hotel) => hotel.id === selectedHotelId) ?? null;
  const visibleLinkEntries = selectedHotelId
    ? latestLinkEntries.filter((entry) => entry.hotelId === selectedHotelId)
    : latestLinkEntries;
  const visibleAudits = selectedHotelId
    ? roomQrReplacementAudits.filter((audit) => audit.hotelId === selectedHotelId)
    : roomQrReplacementAudits;

  function handleProvisionedHotel(
    hotel: { id: string; name: string },
    nextStep: "hearing-sheet" | "rooms" = "hearing-sheet",
  ) {
    setHotelOptions((current) =>
      current.some((item) => item.id === hotel.id) ? current : [hotel, ...current],
    );
    setSelectedHotelId(hotel.id);
    setIsHotelPickerOpen(false);
    window.setTimeout(() => {
      document.getElementById(nextStep)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <div className="hotels-square grid gap-6">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="inline-flex min-h-10 items-center border border-[var(--border)] bg-white px-4 text-sm font-medium text-stone-700 transition hover:bg-[var(--surface-muted)]"
          >
            使い方ヒント
          </button>
        </div>
      </div>

      <section id="trial-accounts" className="grid scroll-mt-24 gap-6">
        <SectionCard
          title="お試し用アカウント登録"
          description="ホテル名、メールアドレス、仮パスワードだけでテスト用ホテルを作成します。ヒアリングは飛ばして、そのまま客室登録とQR出力へ進めます。"
          className="!rounded-none"
        >
          <div className="rounded-none border border-[var(--border)] bg-white p-4">
            <p className="text-sm font-semibold text-stone-950">お試し用ホテル作成</p>
            <div className="mt-4">
              <TrialHotelProvisionForm onProvisioned={handleProvisionedHotel} />
            </div>
          </div>
        </SectionCard>
      </section>

      <section id="accounts" className="grid scroll-mt-24 gap-6">
        <SectionCard
          title="ステップ1. アカウント発行"
          description="新規ホテルを作るときだけ実行します。既存ホテルの追加作業なら次のステップへ進んでください。"
          className="!rounded-none"
        >
          <div className="rounded-none border border-[var(--border)] bg-white p-4">
            <p className="text-sm font-semibold text-stone-950">ホテル作成</p>
            <div className="mt-4">
              <HotelAdminProvisionForm onProvisioned={handleProvisionedHotel} square />
            </div>
          </div>
        </SectionCard>
      </section>

      <section id="hearing-sheet" className="grid scroll-mt-24 gap-6">
        <div className="px-4 md:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setIsHotelPickerOpen(true)}
            className="inline-flex min-h-10 items-center border border-[var(--border)] bg-white px-4 text-sm font-medium text-stone-700 transition hover:bg-[var(--surface-muted)]"
          >
            {selectedHotel ? `ホテルを変更: ${selectedHotel.name}` : "ホテルを選択"}
          </button>
        </div>
        <SectionCard
          title="ステップ2. ヒアリングシート運用"
          description="選択中ホテルのヒアリングURLを発行します。発行後はそのまま担当者へ送ってください。"
          className="!rounded-none"
        >
          <div className="space-y-6">
            <div className="rounded-none border border-[var(--border)] bg-white p-4">
              <p className="text-sm font-semibold text-stone-950">入力URL発行</p>
              <div className="mt-4">
                <HearingSheetLinkForm
                  hotels={hotelOptions}
                  selectedHotelId={selectedHotelId || undefined}
                  selectedHotelName={selectedHotel?.name}
                  square
                />
              </div>
            </div>

            <div className="rounded-none border border-[var(--border)] bg-white">
              <button
                type="button"
                onClick={() => setIsRecentLinksOpen((current) => !current)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-stone-950">最近発行したURL</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {selectedHotel ? `${selectedHotel.name} の発行履歴を表示しています。` : "最近の発行履歴を表示しています。"}
                  </p>
                </div>
                <span className="text-sm text-stone-500">{isRecentLinksOpen ? "閉じる" : "開く"}</span>
              </button>

              {isRecentLinksOpen ? (
                <div className="border-t border-[var(--border)] px-4 py-4">
                  <div className="space-y-3">
                    {visibleLinkEntries.length === 0 ? (
                      <p className="text-sm leading-6 text-stone-500">まだ発行履歴はありません。</p>
                    ) : (
                      visibleLinkEntries.slice(0, 6).map((entry) => (
                        <article key={`link-${entry.hotelId}-${entry.url ?? "none"}`} className="rounded-none border border-[var(--border)] bg-stone-50 p-3">
                          <p className="text-sm font-semibold text-stone-950">{entry.hotelName}</p>
                          {entry.url ? (
                            <>
                              <p className="mt-2 break-all text-xs leading-6 text-stone-600">{entry.url}</p>
                              <p className="mt-2 text-xs text-stone-500">発行日時 {formatTimestamp(entry.createdAt)}</p>
                            </>
                          ) : (
                            <p className="mt-2 text-xs text-stone-500">未発行</p>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>
      </section>

      <section id="rooms" className="grid scroll-mt-24 gap-6 xl:grid-cols-2">
        <SectionCard
          title="ステップ3. 客室登録"
          description="選択中ホテルに対して客室をまとめて作成します。"
          className="!rounded-none"
        >
          <RoomCountSetupForm
            hotels={hotelOptions}
            selectedHotelId={selectedHotelId || undefined}
            selectedHotelName={selectedHotel?.name}
            square
          />
        </SectionCard>

        <SectionCard
          title="ステップ4. 客室QR生成・PDF出力"
          className="!rounded-none"
        >
          <RoomQrWorkflowForm
            hotels={hotelOptions}
            selectedHotelId={selectedHotelId || undefined}
            selectedHotelName={selectedHotel?.name}
            square
          />
        </SectionCard>

        {visibleAudits.length > 0 ? (
          <SectionCard
            title="QR差し替え確認"
            description="選択中ホテルの掲示済みQRが roomly.chat 以外を向いていないか確認します。"
            className="!rounded-none"
          >
            <div className="space-y-4">
              {visibleAudits.map((audit) => (
                <article key={audit.hotelId} className="rounded-none border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-stone-950">{audit.hotelName}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">
                    {audit.totalQrs} 室中 {audit.mismatchedCount} 室が <code>{audit.targetHost}</code> 以外を向いています。
                  </p>
                  <div className="mt-3 space-y-2">
                    {audit.mismatchedRooms.slice(0, 8).map((room) => (
                      <div key={room.roomId} className="rounded-none border border-amber-200 bg-white p-3 text-xs leading-6 text-stone-700">
                        <p>
                          Room {room.roomNumber} / 現在ドメイン: <code>{room.guestUrlHost}</code>
                        </p>
                        <p className="break-all text-stone-500">{room.guestUrl}</p>
                      </div>
                    ))}
                    {audit.mismatchedRooms.length > 8 ? (
                      <p className="text-xs text-stone-500">他 {audit.mismatchedRooms.length - 8} 室も差し替え対象です。</p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </section>

      {isGuideOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4">
          <div className="w-full max-w-3xl border border-[var(--border)] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-[var(--accent)] uppercase">
                  Hotels Guide
                </p>
                <h2 className="mt-1 text-xl font-semibold text-stone-950">使い方ヒント</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="inline-flex min-h-10 items-center border border-[var(--border)] bg-white px-4 text-sm text-stone-700 transition hover:bg-[var(--surface-muted)]"
              >
                閉じる
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
              {[
                { step: "1", title: "ホテル作成", body: "最初にホテルと管理者アカウントを発行します。" },
                { step: "2", title: "ヒアリングURL発行", body: "担当者へ送る入力URLを作成します。" },
                { step: "3", title: "客室登録", body: "階数ごとの部屋数を入れて客室をまとめて作成します。" },
                { step: "4", title: "QR生成と出力", body: "客室QRを生成して、そのままPDF出力まで進めます。" },
              ].map((item) => (
                <div key={item.step} className="border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                  <p className="text-xs font-semibold tracking-[0.18em] text-stone-500">STEP {item.step}</p>
                  <p className="mt-3 text-lg font-semibold text-stone-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isHotelPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4">
          <div className="w-full max-w-lg border border-[var(--border)] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-[var(--accent)] uppercase">
                  Hotel Picker
                </p>
                <h2 className="mt-1 text-xl font-semibold text-stone-950">ホテルを選択</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsHotelPickerOpen(false)}
                className="inline-flex min-h-10 items-center border border-[var(--border)] bg-white px-4 text-sm text-stone-700 transition hover:bg-[var(--surface-muted)]"
              >
                閉じる
              </button>
            </div>

            <div className="px-5 py-5">
              <label className="form-label">
                対象ホテル
                <select
                  value={selectedHotelId}
                  onChange={(event) => setSelectedHotelId(event.target.value)}
                  className="form-select"
                >
                  {hotelOptions.length === 0 ? (
                    <option value="">ホテルがありません</option>
                  ) : null}
                  {hotelOptions.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
