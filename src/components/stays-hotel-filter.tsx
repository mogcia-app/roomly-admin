"use client";

import { ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type HotelOption = {
  id: string;
  name: string;
};

export function StaysHotelFilter({
  hotels,
  selectedHotelId,
}: {
  hotels: HotelOption[];
  selectedHotelId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextHotelId = event.target.value;
    const params = new URLSearchParams(searchParams.toString());

    if (nextHotelId) {
      params.set("stayHotelId", nextHotelId);
    } else {
      params.delete("stayHotelId");
    }

    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
      <label className="grid gap-2 text-sm text-stone-700">
      ホテルで有効滞在を絞り込む
      <select
        value={selectedHotelId ?? ""}
        onChange={handleChange}
        className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
      >
        <option value="">全ホテル</option>
        {hotels.map((hotel) => (
          <option key={hotel.id} value={hotel.id}>
            {hotel.name}
          </option>
        ))}
      </select>
    </label>
  );
}
