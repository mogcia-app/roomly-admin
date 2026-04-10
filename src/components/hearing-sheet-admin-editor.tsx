"use client";

import { useState } from "react";

import { HearingSheetPublicForm } from "@/components/hearing-sheet-public-form";
import type { HearingSheetData } from "@/lib/server/roomly-admin";

export function HearingSheetAdminEditor({
  hotelId,
  initialData,
  initiallyOpen = false,
}: {
  hotelId: string;
  initialData: HearingSheetData;
  initiallyOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div className="mt-4 border-t border-white/70 pt-4">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center rounded-none border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-medium text-stone-600 transition hover:bg-stone-100"
      >
        {isOpen ? "編集を閉じる" : "編集"}
      </button>
      {isOpen ? (
        <div className="mt-4 border border-stone-200 bg-white p-4">
          <HearingSheetPublicForm
            submitUrl={`/api/admin/hotels/${hotelId}/hearing-sheet/data`}
            submitLabel="保存"
            successMessage="ヒアリングシートを保存しました。"
            initialData={initialData}
          />
        </div>
      ) : null}
    </div>
  );
}
