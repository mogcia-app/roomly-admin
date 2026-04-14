"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type HotelOption = {
  id: string;
  name: string;
};

type FloorRow = {
  id: number;
  floor: string;
  roomCount: string;
};

const FLOOR_OPTIONS = Array.from({ length: 50 }, (_, index) => index + 1);

export function RoomCountSetupForm({
  hotels,
  selectedHotelId,
  selectedHotelName,
  square = false,
}: {
  hotels: HotelOption[];
  selectedHotelId?: string;
  selectedHotelName?: string;
  square?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState<FloorRow[]>([{ id: 1, floor: "1", roomCount: "" }]);

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: current[current.length - 1]?.id ? current[current.length - 1].id + 1 : 1,
        floor: "",
        roomCount: "",
      },
    ]);
  }

  function updateRow(id: number, key: "floor" | "roomCount", value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function removeRow(id: number) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const hotelId = selectedHotelId ?? String(formData.get("hotelId") ?? "");

    if (!hotelId) {
      setError("hotelId は必須です。");
      setIsSubmitting(false);
      return;
    }

    const floorAssignments = rows.map((row) => ({
      floor: Number(row.floor),
      roomCount: Number(row.roomCount),
    }));

    if (floorAssignments.some((row) => !Number.isInteger(row.floor) || row.floor < 1 || row.floor > 50)) {
      setError("階数は 1F から 50F の間で選択してください。");
      setIsSubmitting(false);
      return;
    }

    if (
      floorAssignments.some(
        (row) => !Number.isInteger(row.roomCount) || row.roomCount < 1 || row.roomCount > 99,
      )
    ) {
      setError("各階の部屋数は 1 から 99 の整数で入力してください。");
      setIsSubmitting(false);
      return;
    }

    const duplicateFloor = floorAssignments.find(
      (row, index) => floorAssignments.findIndex((candidate) => candidate.floor === row.floor) !== index,
    );

    if (duplicateFloor) {
      setError(`階数 ${duplicateFloor.floor}F が重複しています。`);
      setIsSubmitting(false);
      return;
    }

    const totalRooms = floorAssignments.reduce((sum, row) => sum + row.roomCount, 0);

    if (totalRooms > 500) {
      setError("作成できる客室数は合計 500 室までです。");
      setIsSubmitting(false);
      return;
    }

    formData.set("floorAssignments", JSON.stringify(floorAssignments));

    const response = await fetch(`/api/admin/hotels/${hotelId}/rooms`, {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { error?: string; imported?: number };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "客室数の登録に失敗しました。");
      return;
    }

    setMessage(
      `${payload.imported ?? 0} 室分の客室を登録しました。部屋番号は各階ごとに 101 / 1201 のような形式で作成しています。`,
    );
    form.reset();
    setRows([{ id: 1, floor: "1", roomCount: "" }]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form className="form-grid" onSubmit={handleSubmit}>
        {selectedHotelId ? (
          <div className={`${square ? "!rounded-none" : "rounded-2xl"} border border-[rgba(180,59,34,0.22)] bg-[rgba(246,216,203,0.52)] px-4 py-3 text-sm text-[var(--foreground)]`}>
            対象ホテル: <strong>{selectedHotelName ?? selectedHotelId}</strong>
            <input type="hidden" name="hotelId" value={selectedHotelId} />
          </div>
        ) : (
          <label className="form-label">
            対象ホテル
            <select
              name="hotelId"
              required
              defaultValue=""
              className={`form-select ${square ? "!rounded-none" : ""}`}
            >
              <option value="" disabled>
                ホテルを選択
              </option>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="form-label">階数ごとの部屋数</p>
            <button
              type="button"
              onClick={addRow}
              className={`form-secondary-button ${square ? "!rounded-none" : ""}`}
            >
              階を追加
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.id} className="floor-room-row">
                <label className="form-label">
                  階数
                  <select
                    value={row.floor}
                    onChange={(event) => updateRow(row.id, "floor", event.target.value)}
                    className={`form-select ${square ? "!rounded-none" : ""}`}
                    required
                  >
                    <option value="" disabled>
                      階を選択
                    </option>
                    {FLOOR_OPTIONS.map((floor) => (
                      <option key={floor} value={floor}>
                        {floor}F
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-label">
                  部屋数
                  <input
                    value={row.roomCount}
                    onChange={(event) => updateRow(row.id, "roomCount", event.target.value)}
                    type="number"
                    min={1}
                    max={99}
                    required
                    className={`form-input ${square ? "!rounded-none" : ""}`}
                    placeholder="10"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className={`form-danger-button ${square ? "!rounded-none" : ""}`}
                  aria-label={`${index + 1}行目を削除`}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="form-hint">
          既に客室が登録されているホテルには追加できません。各階の部屋番号は
          <code>1F → 101, 102...</code>、<code>12F → 1201, 1202...</code>
          のように自動採番します。
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`form-submit ${square ? "!rounded-none" : ""}`}
        >
          {isSubmitting ? "登録中..." : "階数ごとに客室を登録"}
        </button>
      </form>

      {error ? (
        <p className={`form-feedback form-feedback-error ${square ? "!rounded-none" : ""}`}>{error}</p>
      ) : null}

      {message ? (
        <p className={`form-feedback form-feedback-success ${square ? "!rounded-none" : ""}`}>{message}</p>
      ) : null}
    </div>
  );
}
