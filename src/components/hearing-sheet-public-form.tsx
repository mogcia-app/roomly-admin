"use client";

import { FormEvent, useState } from "react";

type NoteItem = {
  label: string;
  content: string;
};

type WifiNetwork = {
  floor: string;
  ssid: string;
  password: string;
  notes: NoteItem[];
};

type BathEntry = {
  name: string;
  hours: string;
  location: string;
  notes: NoteItem[];
};

type FacilityEntry = {
  name: string;
  hours: string;
  notes: NoteItem[];
};

type FacilityLocationEntry = {
  name: string;
  floor: string;
  notes: NoteItem[];
};

type BreakfastEntry = {
  style: string;
  hours: string;
  location: string;
  price: string;
  reservationRequired: string;
  notes: NoteItem[];
};

type AmenityEntry = {
  name: string;
  inRoom: string;
  availableOnRequest: string;
  price: string;
  notes: NoteItem[];
};

type ParkingEntry = {
  name: string;
  capacity: string;
  price: string;
  hours: string;
  reservationRequired: string;
  location: string;
  notes: NoteItem[];
};

type EmergencyEntry = {
  category: string;
  contact: string;
  steps: string;
  notes: NoteItem[];
};

type FaqEntry = {
  question: string;
  answer: string;
};

type CheckoutEntry = {
  time: string;
  method: string;
  keyReturnLocation: string;
  lateCheckoutPolicy: string;
  notes: NoteItem[];
};

type RoomServiceEntry = {
  menuName: string;
  price: string;
  orderMethod: string;
  hours: string;
  notes: NoteItem[];
};

type TransportEntry = {
  companyName: string;
  serviceType: string;
  phone: string;
  hours: string;
  priceNote: string;
  notes: NoteItem[];
};

type NearbySpotEntry = {
  name: string;
  category: string;
  distance: string;
  hours: string;
  location: string;
  notes: NoteItem[];
};

type SheetData = {
  contactName?: string;
  contactEmail?: string;
  frontDeskHours?: string;
  wifiNetworks?: WifiNetwork[];
  bathEntries?: BathEntry[];
  facilityEntries?: FacilityEntry[];
  facilityLocationEntries?: FacilityLocationEntry[];
  breakfastEntries?: BreakfastEntry[];
  amenityEntries?: AmenityEntry[];
  parkingEntries?: ParkingEntry[];
  emergencyEntries?: EmergencyEntry[];
  faqEntries?: FaqEntry[];
  checkoutEntries?: CheckoutEntry[];
  roomServiceEntries?: RoomServiceEntry[];
  transportEntries?: TransportEntry[];
  nearbySpotEntries?: NearbySpotEntry[];
};

const EMPTY_NOTE_ITEM: NoteItem = { label: "", content: "" };
const EMPTY_WIFI: WifiNetwork = { floor: "", ssid: "", password: "", notes: [{ ...EMPTY_NOTE_ITEM }] };
const EMPTY_BATH: BathEntry = { name: "", hours: "", location: "", notes: [{ ...EMPTY_NOTE_ITEM }] };
const EMPTY_FACILITY: FacilityEntry = { name: "", hours: "", notes: [{ ...EMPTY_NOTE_ITEM }] };
const EMPTY_FACILITY_LOCATION: FacilityLocationEntry = {
  name: "",
  floor: "",
  notes: [{ ...EMPTY_NOTE_ITEM }],
};
const EMPTY_BREAKFAST: BreakfastEntry = {
  style: "",
  hours: "",
  location: "",
  price: "",
  reservationRequired: "",
  notes: [{ ...EMPTY_NOTE_ITEM }],
};
const EMPTY_AMENITY: AmenityEntry = {
  name: "",
  inRoom: "",
  availableOnRequest: "",
  price: "",
  notes: [{ ...EMPTY_NOTE_ITEM }],
};
const EMPTY_PARKING: ParkingEntry = {
  name: "",
  capacity: "",
  price: "",
  hours: "",
  reservationRequired: "",
  location: "",
  notes: [{ ...EMPTY_NOTE_ITEM }],
};
const EMPTY_EMERGENCY: EmergencyEntry = {
  category: "",
  contact: "",
  steps: "",
  notes: [{ ...EMPTY_NOTE_ITEM }],
};
const EMPTY_FAQ: FaqEntry = { question: "", answer: "" };
const EMPTY_CHECKOUT: CheckoutEntry = {
  time: "",
  method: "",
  keyReturnLocation: "",
  lateCheckoutPolicy: "",
  notes: [{ ...EMPTY_NOTE_ITEM }],
};
const EMPTY_ROOM_SERVICE: RoomServiceEntry = {
  menuName: "",
  price: "",
  orderMethod: "",
  hours: "",
  notes: [{ ...EMPTY_NOTE_ITEM }],
};
const EMPTY_TRANSPORT: TransportEntry = {
  companyName: "",
  serviceType: "",
  phone: "",
  hours: "",
  priceNote: "",
  notes: [{ ...EMPTY_NOTE_ITEM }],
};
const EMPTY_NEARBY_SPOT: NearbySpotEntry = {
  name: "",
  category: "",
  distance: "",
  hours: "",
  location: "",
  notes: [{ ...EMPTY_NOTE_ITEM }],
};

export function HearingSheetPublicForm({
  token,
  submitUrl,
  submitLabel = "ヒアリングシートを送信",
  successMessage = "ヒアリングシートを送信しました。内容は管理画面で確認できます。",
  initialData,
}: {
  token?: string;
  submitUrl?: string;
  submitLabel?: string;
  successMessage?: string;
  initialData?: SheetData | null;
}) {
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>(
    initialData?.wifiNetworks?.length ? initialData.wifiNetworks : [EMPTY_WIFI],
  );
  const [expandedWifiRows, setExpandedWifiRows] = useState<number[]>([0]);
  const [bathEntries, setBathEntries] = useState<BathEntry[]>(
    initialData?.bathEntries?.length ? initialData.bathEntries : [EMPTY_BATH],
  );
  const [facilityEntries, setFacilityEntries] = useState<FacilityEntry[]>(
    initialData?.facilityEntries?.length ? initialData.facilityEntries : [EMPTY_FACILITY],
  );
  const [facilityLocationEntries, setFacilityLocationEntries] = useState<FacilityLocationEntry[]>(
    initialData?.facilityLocationEntries?.length
      ? initialData.facilityLocationEntries
      : [EMPTY_FACILITY_LOCATION],
  );
  const [breakfastEntries, setBreakfastEntries] = useState<BreakfastEntry[]>(
    initialData?.breakfastEntries?.length ? initialData.breakfastEntries : [EMPTY_BREAKFAST],
  );
  const [amenityEntries, setAmenityEntries] = useState<AmenityEntry[]>(
    initialData?.amenityEntries?.length ? initialData.amenityEntries : [EMPTY_AMENITY],
  );
  const [parkingEntries, setParkingEntries] = useState<ParkingEntry[]>(
    initialData?.parkingEntries?.length ? initialData.parkingEntries : [EMPTY_PARKING],
  );
  const [emergencyEntries, setEmergencyEntries] = useState<EmergencyEntry[]>(
    initialData?.emergencyEntries?.length ? initialData.emergencyEntries : [EMPTY_EMERGENCY],
  );
  const [faqEntries, setFaqEntries] = useState<FaqEntry[]>(
    initialData?.faqEntries?.length ? initialData.faqEntries : [EMPTY_FAQ],
  );
  const [checkoutEntries, setCheckoutEntries] = useState<CheckoutEntry[]>(
    initialData?.checkoutEntries?.length ? initialData.checkoutEntries : [EMPTY_CHECKOUT],
  );
  const [roomServiceEntries, setRoomServiceEntries] = useState<RoomServiceEntry[]>(
    initialData?.roomServiceEntries?.length ? initialData.roomServiceEntries : [EMPTY_ROOM_SERVICE],
  );
  const [transportEntries, setTransportEntries] = useState<TransportEntry[]>(
    initialData?.transportEntries?.length ? initialData.transportEntries : [EMPTY_TRANSPORT],
  );
  const [nearbySpotEntries, setNearbySpotEntries] = useState<NearbySpotEntry[]>(
    initialData?.nearbySpotEntries?.length ? initialData.nearbySpotEntries : [EMPTY_NEARBY_SPOT],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      ...Object.fromEntries(formData.entries()),
      wifiNetworks: wifiNetworks
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter((entry) => entry.floor || entry.ssid || entry.password || entry.notes.length > 0),
      bathEntries: bathEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter((entry) => entry.name || entry.hours || entry.location || entry.notes.length > 0),
      facilityEntries: facilityEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter((entry) => entry.name || entry.hours || entry.notes.length > 0),
      facilityLocationEntries: facilityLocationEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter((entry) => entry.name || entry.floor || entry.notes.length > 0),
      breakfastEntries: breakfastEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter(
          (entry) =>
            entry.style ||
            entry.hours ||
            entry.location ||
            entry.price ||
            entry.reservationRequired ||
            entry.notes.length > 0,
        ),
      amenityEntries: amenityEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter(
          (entry) =>
            entry.name ||
            entry.inRoom ||
            entry.availableOnRequest ||
            entry.price ||
            entry.notes.length > 0,
        ),
      parkingEntries: parkingEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter(
          (entry) =>
            entry.name ||
            entry.capacity ||
            entry.price ||
            entry.hours ||
            entry.reservationRequired ||
            entry.location ||
            entry.notes.length > 0,
        ),
      emergencyEntries: emergencyEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter((entry) => entry.category || entry.contact || entry.steps || entry.notes.length > 0),
      faqEntries: sanitizeList(faqEntries, ["question", "answer"]),
      checkoutEntries: checkoutEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter(
          (entry) =>
            entry.time ||
            entry.method ||
            entry.keyReturnLocation ||
            entry.lateCheckoutPolicy ||
            entry.notes.length > 0,
        ),
      roomServiceEntries: roomServiceEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter(
          (entry) => entry.menuName || entry.price || entry.orderMethod || entry.hours || entry.notes.length > 0,
        ),
      transportEntries: transportEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter(
          (entry) =>
            entry.companyName ||
            entry.serviceType ||
            entry.phone ||
            entry.hours ||
            entry.priceNote ||
            entry.notes.length > 0,
        ),
      nearbySpotEntries: nearbySpotEntries
        .map((entry) => ({ ...entry, notes: sanitizeNoteItems(entry.notes) }))
        .map(trimStringFields)
        .filter(
          (entry) =>
            entry.name || entry.category || entry.distance || entry.hours || entry.location || entry.notes.length > 0,
        ),
    };

    const targetUrl = submitUrl ?? `/api/public/hearing-sheet/${token}`;
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setError(result.error ?? "送信に失敗しました。");
      return;
    }

    setSuccess(successMessage);
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="担当者名"
          name="contactName"
          defaultValue={initialData?.contactName}
          required
          inputClassName="rounded-none"
        />
        <Field
          label="担当者メールアドレス"
          name="contactEmail"
          type="email"
          defaultValue={initialData?.contactEmail}
          required
          inputClassName="rounded-none"
        />
        <Field
          label="フロント対応時間"
          name="frontDeskHours"
          defaultValue={initialData?.frontDeskHours}
          placeholder="7:00-22:00 / 夜間は緊急連絡先へ"
          inputClassName="rounded-none"
        />
      </div>

      <SectionBlock
        title="Wi-Fi設定"
        description="階数ごとに SSID とパスワードを登録できます。全館共通なら「全館」で入力してください。"
        addLabel="+追加"
        className="rounded-none"
        addButtonClassName="rounded-none"
        childrenClassName="grid gap-3"
        onAdd={() => {
          setWifiNetworks((current) => [...current, EMPTY_WIFI]);
          setExpandedWifiRows((current) => [...current, wifiNetworks.length]);
        }}
      >
        <div className="hidden gap-3 rounded-none border border-stone-200 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 md:grid md:grid-cols-[0.9fr_1fr_1fr_auto_auto]">
          <span>対象階</span>
          <span>SSID</span>
          <span>パスワード</span>
          <span>補足</span>
          <span>操作</span>
        </div>
        <div className="grid gap-3">
          {wifiNetworks.map((network, index) => {
            const isExpanded = expandedWifiRows.includes(index);
            const noteCount = sanitizeNoteItems(network.notes).length;

            return (
              <div key={`wifi-${index}`} className="rounded-none border border-stone-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-[0.9fr_1fr_1fr_auto_auto] md:items-end">
                <Field
                  label="対象階"
                  name={`wifi-floor-${index}`}
                  value={network.floor}
                  onChange={(value) => setWifiNetworks((current) => updateItem(current, index, { floor: value }))}
                  placeholder="全館 / 3F / 5-7F"
                  inputClassName="rounded-none"
                />
                <Field
                  label="SSID"
                  name={`wifi-ssid-${index}`}
                  value={network.ssid}
                  onChange={(value) => setWifiNetworks((current) => updateItem(current, index, { ssid: value }))}
                  placeholder="Roomly-3F"
                  inputClassName="rounded-none"
                />
                <Field
                  label="パスワード"
                  name={`wifi-password-${index}`}
                  value={network.password}
                  onChange={(value) =>
                    setWifiNetworks((current) => updateItem(current, index, { password: value }))
                  }
                  placeholder="password1234"
                  inputClassName="rounded-none"
                />
                  <div className="grid gap-2">
                    <span className="text-sm text-stone-700 md:text-xs md:font-medium md:text-stone-500">
                      補足
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedWifiRows((current) =>
                          current.includes(index)
                            ? current.filter((item) => item !== index)
                            : [...current, index],
                        )
                      }
                      className="inline-flex h-[28px] items-center justify-center rounded-none border border-stone-200 bg-stone-50 px-2 text-[10px] font-medium text-stone-500 transition hover:bg-stone-100"
                    >
                      {isExpanded ? "閉じる" : `+補足${noteCount > 0 ? ` (${noteCount})` : ""}`}
                    </button>
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm text-stone-700 md:text-xs md:font-medium md:text-stone-500">
                      操作
                    </span>
                    {wifiNetworks.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setWifiNetworks((current) => current.filter((_, entryIndex) => entryIndex !== index));
                          setExpandedWifiRows((current) =>
                            current
                              .filter((item) => item !== index)
                              .map((item) => (item > index ? item - 1 : item)),
                          );
                        }}
                        className="inline-flex h-[28px] items-center justify-center rounded-none border border-stone-200 bg-stone-50 px-2 text-[10px] font-medium text-stone-500 transition hover:bg-stone-100"
                      >
                        削除
                      </button>
                    ) : (
                      <div className="h-[50px]" />
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <div className="mt-4 border-t border-stone-200 pt-4">
                    <NotePairsField
                      label="補足"
                      entries={network.notes}
                      onChange={(value) =>
                        setWifiNetworks((current) => updateItem(current, index, { notes: value }))
                      }
                      inputClassName="rounded-none"
                      buttonClassName="rounded-none"
                      hideLabel={true}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </SectionBlock>

      <SectionBlock
        title="朝食情報"
        description="形式・時間・場所・料金を分けて登録できます。"
        addLabel="+追加"
        onAdd={() => setBreakfastEntries((current) => [...current, EMPTY_BREAKFAST])}
      >
        <SectionHeaderRow columns={["形式", "時間", "場所", "料金 / 予約", "補足"]} />
        {breakfastEntries.map((entry, index) => (
          <EntryCard
            key={`breakfast-${index}`}
            canRemove={breakfastEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[
                  entry.style || "未入力",
                  entry.hours || "未入力",
                  entry.location || "未入力",
                  [entry.price, entry.reservationRequired].filter(Boolean).join(" / ") || "未入力",
                  summarizeNotes(entry.notes),
                ]}
              />
            }
            onRemove={() =>
              setBreakfastEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
            }
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="形式"
                name={`breakfast-style-${index}`}
                value={entry.style}
                onChange={(value) =>
                  setBreakfastEntries((current) => updateItem(current, index, { style: value }))
                }
                placeholder="ビュッフェ / 和定食"
              />
              <Field
                label="時間"
                name={`breakfast-hours-${index}`}
                value={entry.hours}
                onChange={(value) =>
                  setBreakfastEntries((current) => updateItem(current, index, { hours: value }))
                }
                placeholder="7:00-9:30"
              />
              <Field
                label="場所"
                name={`breakfast-location-${index}`}
                value={entry.location}
                onChange={(value) =>
                  setBreakfastEntries((current) => updateItem(current, index, { location: value }))
                }
                placeholder="1F レストラン"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="料金"
                name={`breakfast-price-${index}`}
                value={entry.price}
                onChange={(value) =>
                  setBreakfastEntries((current) => updateItem(current, index, { price: value }))
                }
                placeholder="大人 1,500円"
              />
              <SelectField
                label="予約要否"
                name={`breakfast-reservation-${index}`}
                value={entry.reservationRequired}
                onChange={(value) =>
                  setBreakfastEntries((current) =>
                    updateItem(current, index, { reservationRequired: value })
                  )
                }
                options={["", "必要", "不要"]}
              />
            </div>
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) => setBreakfastEntries((current) => updateItem(current, index, { notes: value }))}
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="大浴場・温泉情報"
        description="施設ごとに場所や営業時間を登録できます。"
        addLabel="+追加"
        onAdd={() => setBathEntries((current) => [...current, EMPTY_BATH])}
      >
        <SectionHeaderRow columns={["名称", "営業時間", "場所", "補足"]} />
        {bathEntries.map((entry, index) => (
          <EntryCard
            key={`bath-${index}`}
            canRemove={bathEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[
                  entry.name || "未入力",
                  entry.hours || "未入力",
                  entry.location || "未入力",
                  summarizeNotes(entry.notes),
                ]}
              />
            }
            onRemove={() =>
              setBathEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
            }
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="名称"
                name={`bath-name-${index}`}
                value={entry.name}
                onChange={(value) => setBathEntries((current) => updateItem(current, index, { name: value }))}
                placeholder="大浴場 / 家族風呂"
              />
              <Field
                label="営業時間"
                name={`bath-hours-${index}`}
                value={entry.hours}
                onChange={(value) => setBathEntries((current) => updateItem(current, index, { hours: value }))}
                placeholder="15:00-24:00 / 6:00-9:00"
              />
              <Field
                label="場所"
                name={`bath-location-${index}`}
                value={entry.location}
                onChange={(value) =>
                  setBathEntries((current) => updateItem(current, index, { location: value }))
                }
                placeholder="1F 奥 / 別館2F"
              />
            </div>
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) => setBathEntries((current) => updateItem(current, index, { notes: value }))}
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="館内設備情報"
        description="設備ごとに使える時間や注意事項を登録できます。"
        addLabel="+追加"
        onAdd={() => setFacilityEntries((current) => [...current, EMPTY_FACILITY])}
      >
        <SectionHeaderRow columns={["設備名", "利用時間", "補足"]} />
        {facilityEntries.map((entry, index) => (
          <EntryCard
            key={`facility-${index}`}
            canRemove={facilityEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[entry.name || "未入力", entry.hours || "未入力", summarizeNotes(entry.notes)]}
              />
            }
            onRemove={() =>
              setFacilityEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="設備名"
                name={`facility-name-${index}`}
                value={entry.name}
                onChange={(value) =>
                  setFacilityEntries((current) => updateItem(current, index, { name: value }))
                }
                placeholder="製氷機 / コインランドリー / 電子レンジ"
              />
              <Field
                label="利用時間"
                name={`facility-hours-${index}`}
                value={entry.hours}
                onChange={(value) =>
                  setFacilityEntries((current) => updateItem(current, index, { hours: value }))
                }
                placeholder="24時間 / 7:00-23:00"
              />
            </div>
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) =>
                setFacilityEntries((current) => updateItem(current, index, { notes: value }))
              }
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="館内設備の場所"
        description="どの設備が何階にあるかを個別に登録できます。"
        addLabel="+追加"
        onAdd={() => setFacilityLocationEntries((current) => [...current, EMPTY_FACILITY_LOCATION])}
      >
        <SectionHeaderRow columns={["設備名", "階・場所", "補足"]} />
        {facilityLocationEntries.map((entry, index) => (
          <EntryCard
            key={`facility-location-${index}`}
            canRemove={facilityLocationEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[entry.name || "未入力", entry.floor || "未入力", summarizeNotes(entry.notes)]}
              />
            }
            onRemove={() =>
              setFacilityLocationEntries((current) =>
                current.filter((_, entryIndex) => entryIndex !== index),
              )
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="設備名"
                name={`facility-location-name-${index}`}
                value={entry.name}
                onChange={(value) =>
                  setFacilityLocationEntries((current) => updateItem(current, index, { name: value }))
                }
                placeholder="製氷機 / コインランドリー / 電子レンジ"
              />
              <Field
                label="階・場所"
                name={`facility-location-floor-${index}`}
                value={entry.floor}
                onChange={(value) =>
                  setFacilityLocationEntries((current) => updateItem(current, index, { floor: value }))
                }
                placeholder="3F / 1F フロント横"
              />
            </div>
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) =>
                setFacilityLocationEntries((current) => updateItem(current, index, { notes: value }))
              }
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="アメニティ"
        description="常設か、追加依頼できるか、依頼方法を登録できます。"
        addLabel="+追加"
        onAdd={() => setAmenityEntries((current) => [...current, EMPTY_AMENITY])}
      >
        <SectionHeaderRow columns={["アイテム", "設置 / 依頼", "方法 / 料金", "補足"]} />
        {amenityEntries.map((entry, index) => (
          <EntryCard
            key={`amenity-${index}`}
            canRemove={amenityEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[
                  entry.name || "未入力",
                  [entry.inRoom && `常設 ${entry.inRoom}`, entry.availableOnRequest && `追加 ${entry.availableOnRequest}`]
                    .filter(Boolean)
                    .join(" / ") || "未入力",
                  entry.price || "未入力",
                  summarizeNotes(entry.notes),
                ]}
              />
            }
            onRemove={() =>
              setAmenityEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
            }
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="アイテム名"
                name={`amenity-name-${index}`}
                value={entry.name}
                onChange={(value) =>
                  setAmenityEntries((current) => updateItem(current, index, { name: value }))
                }
                placeholder="歯ブラシ / 加湿器"
              />
              <SelectField
                label="客室常設"
                name={`amenity-in-room-${index}`}
                value={entry.inRoom}
                onChange={(value) =>
                  setAmenityEntries((current) => updateItem(current, index, { inRoom: value }))
                }
                options={["", "はい", "いいえ"]}
              />
              <SelectField
                label="追加依頼可否"
                name={`amenity-request-${index}`}
                value={entry.availableOnRequest}
                onChange={(value) =>
                  setAmenityEntries((current) =>
                    updateItem(current, index, { availableOnRequest: value })
                  )
                }
                options={["", "可能", "不可"]}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-1">
              <Field
                label="料金"
                name={`amenity-price-${index}`}
                value={entry.price}
                onChange={(value) =>
                  setAmenityEntries((current) => updateItem(current, index, { price: value }))
                }
                placeholder="無料 / 1回 300円"
              />
            </div>
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) =>
                setAmenityEntries((current) => updateItem(current, index, { notes: value }))
              }
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="駐車場"
        description="駐車場が複数ある場合も個別に登録できます。"
        addLabel="+追加"
        onAdd={() => setParkingEntries((current) => [...current, EMPTY_PARKING])}
      >
        <SectionHeaderRow columns={["名称", "台数 / 料金", "時間 / 予約 / 場所", "補足"]} />
        {parkingEntries.map((entry, index) => (
          <EntryCard
            key={`parking-${index}`}
            canRemove={parkingEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[
                  entry.name || "未入力",
                  [entry.capacity, entry.price].filter(Boolean).join(" / ") || "未入力",
                  [entry.hours, entry.reservationRequired, entry.location].filter(Boolean).join(" / ") || "未入力",
                  summarizeNotes(entry.notes),
                ]}
              />
            }
            onRemove={() =>
              setParkingEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
            }
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="名称"
                name={`parking-name-${index}`}
                value={entry.name}
                onChange={(value) =>
                  setParkingEntries((current) => updateItem(current, index, { name: value }))
                }
                placeholder="平面駐車場 / 提携駐車場"
              />
              <Field
                label="台数"
                name={`parking-capacity-${index}`}
                value={entry.capacity}
                onChange={(value) =>
                  setParkingEntries((current) => updateItem(current, index, { capacity: value }))
                }
                placeholder="20台"
              />
              <Field
                label="料金"
                name={`parking-price-${index}`}
                value={entry.price}
                onChange={(value) =>
                  setParkingEntries((current) => updateItem(current, index, { price: value }))
                }
                placeholder="1泊 1,000円"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="入出庫時間"
                name={`parking-hours-${index}`}
                value={entry.hours}
                onChange={(value) =>
                  setParkingEntries((current) => updateItem(current, index, { hours: value }))
                }
                placeholder="24時間 / 7:00-22:00"
              />
              <SelectField
                label="予約要否"
                name={`parking-reservation-${index}`}
                value={entry.reservationRequired}
                onChange={(value) =>
                  setParkingEntries((current) =>
                    updateItem(current, index, { reservationRequired: value })
                  )
                }
                options={["", "必要", "不要"]}
              />
              <Field
                label="場所"
                name={`parking-location-${index}`}
                value={entry.location}
                onChange={(value) =>
                  setParkingEntries((current) => updateItem(current, index, { location: value }))
                }
                placeholder="ホテル裏手 / 徒歩3分"
              />
            </div>
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) =>
                setParkingEntries((current) => updateItem(current, index, { notes: value }))
              }
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="緊急時メモ"
        description="カテゴリごとに連絡先と対応手順を登録できます。"
        addLabel="+追加"
        onAdd={() => setEmergencyEntries((current) => [...current, EMPTY_EMERGENCY])}
      >
        <SectionHeaderRow columns={["カテゴリ", "連絡先", "手順", "補足"]} />
        {emergencyEntries.map((entry, index) => (
          <EntryCard
            key={`emergency-${index}`}
            canRemove={emergencyEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[
                  entry.category || "未入力",
                  entry.contact || "未入力",
                  entry.steps || "未入力",
                  summarizeNotes(entry.notes),
                ]}
              />
            }
            onRemove={() =>
              setEmergencyEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="カテゴリ"
                name={`emergency-category-${index}`}
                value={entry.category}
                onChange={(value) =>
                  setEmergencyEntries((current) => updateItem(current, index, { category: value }))
                }
                placeholder="火災 / 体調不良 / 停電"
              />
              <Field
                label="連絡先"
                name={`emergency-contact-${index}`}
                value={entry.contact}
                onChange={(value) =>
                  setEmergencyEntries((current) => updateItem(current, index, { contact: value }))
                }
                placeholder="フロント内線9 / 090-xxxx-xxxx"
              />
            </div>
            <TextArea
              label="手順"
              name={`emergency-steps-${index}`}
              value={entry.steps}
              onChange={(value) =>
                setEmergencyEntries((current) => updateItem(current, index, { steps: value }))
              }
              placeholder="まずフロントへ連絡、その後避難誘導に従う、など"
              rows={3}
            />
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) =>
                setEmergencyEntries((current) => updateItem(current, index, { notes: value }))
              }
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="よくある質問"
        description="質問と回答をペアで登録します。"
        addLabel="+追加"
        onAdd={() => setFaqEntries((current) => [...current, EMPTY_FAQ])}
      >
        <SectionHeaderRow columns={["質問", "回答"]} />
        {faqEntries.map((entry, index) => (
          <EntryCard
            key={`faq-${index}`}
            canRemove={faqEntries.length > 1}
            removeLabel="削除"
            summary={<SummaryGrid columns={[entry.question || "未入力", entry.answer || "未入力"]} />}
            onRemove={() => setFaqEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))}
          >
            <TextArea
              label="質問文"
              name={`faq-question-${index}`}
              value={entry.question}
              onChange={(value) => setFaqEntries((current) => updateItem(current, index, { question: value }))}
              placeholder="チェックアウトは何時ですか？"
              rows={2}
            />
            <TextArea
              label="回答文"
              name={`faq-answer-${index}`}
              value={entry.answer}
              onChange={(value) => setFaqEntries((current) => updateItem(current, index, { answer: value }))}
              placeholder="チェックアウトは10:00です。鍵は1Fフロントへご返却ください。"
              rows={3}
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="チェックアウト"
        description="時間・方法・鍵の返却場所を分けて登録できます。"
        addLabel="+追加"
        onAdd={() => setCheckoutEntries((current) => [...current, EMPTY_CHECKOUT])}
      >
        <SectionHeaderRow columns={["時間 / 方法", "鍵返却 / 延長", "補足"]} />
        {checkoutEntries.map((entry, index) => (
          <EntryCard
            key={`checkout-${index}`}
            canRemove={checkoutEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[
                  [entry.time, entry.method].filter(Boolean).join(" / ") || "未入力",
                  [entry.keyReturnLocation, entry.lateCheckoutPolicy].filter(Boolean).join(" / ") || "未入力",
                  summarizeNotes(entry.notes),
                ]}
              />
            }
            onRemove={() =>
              setCheckoutEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="時間"
                name={`checkout-time-${index}`}
                value={entry.time}
                onChange={(value) =>
                  setCheckoutEntries((current) => updateItem(current, index, { time: value }))
                }
                placeholder="10:00"
              />
              <Field
                label="方法"
                name={`checkout-method-${index}`}
                value={entry.method}
                onChange={(value) =>
                  setCheckoutEntries((current) => updateItem(current, index, { method: value }))
                }
                placeholder="フロント精算 / 無人チェックアウト"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="鍵の返却場所"
                name={`checkout-key-${index}`}
                value={entry.keyReturnLocation}
                onChange={(value) =>
                  setCheckoutEntries((current) =>
                    updateItem(current, index, { keyReturnLocation: value })
                  )
                }
                placeholder="1F フロント / 返却BOX"
              />
              <Field
                label="延長可否・条件"
                name={`checkout-late-${index}`}
                value={entry.lateCheckoutPolicy}
                onChange={(value) =>
                  setCheckoutEntries((current) =>
                    updateItem(current, index, { lateCheckoutPolicy: value })
                  )
                }
                placeholder="1時間 1,000円 / 当日確認"
              />
            </div>
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) =>
                setCheckoutEntries((current) => updateItem(current, index, { notes: value }))
              }
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="提携交通情報"
        description="提携タクシー会社や送迎サービスを登録できます。"
        addLabel="+追加"
        onAdd={() => setTransportEntries((current) => [...current, EMPTY_TRANSPORT])}
      >
        <SectionHeaderRow columns={["会社 / 種別 / 電話", "時間 / 料金", "補足"]} />
        {transportEntries.map((entry, index) => (
          <EntryCard
            key={`transport-${index}`}
            canRemove={transportEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[
                  [entry.companyName, entry.serviceType, entry.phone].filter(Boolean).join(" / ") || "未入力",
                  [entry.hours, entry.priceNote].filter(Boolean).join(" / ") || "未入力",
                  summarizeNotes(entry.notes),
                ]}
              />
            }
            onRemove={() =>
              setTransportEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
            }
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="会社名"
                name={`transport-company-${index}`}
                value={entry.companyName}
                onChange={(value) =>
                  setTransportEntries((current) => updateItem(current, index, { companyName: value }))
                }
                placeholder="Roomly Taxi"
              />
              <SelectField
                label="種別"
                name={`transport-type-${index}`}
                value={entry.serviceType}
                onChange={(value) =>
                  setTransportEntries((current) => updateItem(current, index, { serviceType: value }))
                }
                options={["", "タクシー", "送迎", "レンタカー", "その他"]}
              />
              <Field
                label="電話番号"
                name={`transport-phone-${index}`}
                value={entry.phone}
                onChange={(value) =>
                  setTransportEntries((current) => updateItem(current, index, { phone: value }))
                }
                placeholder="03-1234-5678"
              />
              <Field
                label="対応時間"
                name={`transport-hours-${index}`}
                value={entry.hours}
                onChange={(value) =>
                  setTransportEntries((current) => updateItem(current, index, { hours: value }))
                }
                placeholder="24時間 / 7:00-22:00"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="料金目安"
                name={`transport-price-${index}`}
                value={entry.priceNote}
                onChange={(value) =>
                  setTransportEntries((current) => updateItem(current, index, { priceNote: value }))
                }
                placeholder="駅まで約1,200円"
              />
            </div>
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) =>
                setTransportEntries((current) => updateItem(current, index, { notes: value }))
              }
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="周辺施設情報"
        description="ホテル近くの施設情報をカテゴリごとに登録できます。"
        addLabel="+追加"
        onAdd={() => setNearbySpotEntries((current) => [...current, EMPTY_NEARBY_SPOT])}
      >
        <SectionHeaderRow columns={["施設 / カテゴリ / 距離", "営業時間 / 場所", "補足"]} />
        {nearbySpotEntries.map((entry, index) => (
          <EntryCard
            key={`nearby-${index}`}
            canRemove={nearbySpotEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[
                  [entry.name, entry.category, entry.distance].filter(Boolean).join(" / ") || "未入力",
                  [entry.hours, entry.location].filter(Boolean).join(" / ") || "未入力",
                  summarizeNotes(entry.notes),
                ]}
              />
            }
            onRemove={() =>
              setNearbySpotEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
            }
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label="施設名"
                name={`nearby-name-${index}`}
                value={entry.name}
                onChange={(value) =>
                  setNearbySpotEntries((current) => updateItem(current, index, { name: value }))
                }
                placeholder="セブンイレブン / ○○駅"
              />
              <SelectField
                label="カテゴリ"
                name={`nearby-category-${index}`}
                value={entry.category}
                onChange={(value) =>
                  setNearbySpotEntries((current) => updateItem(current, index, { category: value }))
                }
                options={["", "コンビニ", "駅", "病院", "ドラッグストア", "飲食店", "観光地", "その他"]}
              />
              <Field
                label="距離・所要時間"
                name={`nearby-distance-${index}`}
                value={entry.distance}
                onChange={(value) =>
                  setNearbySpotEntries((current) => updateItem(current, index, { distance: value }))
                }
                placeholder="徒歩3分 / 250m"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="営業時間"
                name={`nearby-hours-${index}`}
                value={entry.hours}
                onChange={(value) =>
                  setNearbySpotEntries((current) => updateItem(current, index, { hours: value }))
                }
                placeholder="24時間 / 10:00-20:00"
              />
              <Field
                label="住所・場所説明"
                name={`nearby-location-${index}`}
                value={entry.location}
                onChange={(value) =>
                  setNearbySpotEntries((current) => updateItem(current, index, { location: value }))
                }
                placeholder="ホテルを出て右、1つ目の角を左"
              />
            </div>
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) =>
                setNearbySpotEntries((current) => updateItem(current, index, { notes: value }))
              }
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <SectionBlock
        title="ルームサービス"
        description="メニューごとに料金と注文方法を登録できます。"
        addLabel="+追加"
        onAdd={() => setRoomServiceEntries((current) => [...current, EMPTY_ROOM_SERVICE])}
      >
        <SectionHeaderRow columns={["メニュー / 料金", "注文方法 / 時間", "補足"]} />
        {roomServiceEntries.map((entry, index) => (
          <EntryCard
            key={`room-service-${index}`}
            canRemove={roomServiceEntries.length > 1}
            removeLabel="削除"
            summary={
              <SummaryGrid
                columns={[
                  [entry.menuName, entry.price].filter(Boolean).join(" / ") || "未入力",
                  [entry.orderMethod, entry.hours].filter(Boolean).join(" / ") || "未入力",
                  summarizeNotes(entry.notes),
                ]}
              />
            }
            onRemove={() =>
              setRoomServiceEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="メニュー名"
                name={`room-service-name-${index}`}
                value={entry.menuName}
                onChange={(value) =>
                  setRoomServiceEntries((current) => updateItem(current, index, { menuName: value }))
                }
                placeholder="和朝食 / おつまみセット"
              />
              <Field
                label="料金"
                name={`room-service-price-${index}`}
                value={entry.price}
                onChange={(value) =>
                  setRoomServiceEntries((current) => updateItem(current, index, { price: value }))
                }
                placeholder="1,500円"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="注文方法"
                name={`room-service-method-${index}`}
                value={entry.orderMethod}
                onChange={(value) =>
                  setRoomServiceEntries((current) => updateItem(current, index, { orderMethod: value }))
                }
                placeholder="客室電話9番 / QR注文"
              />
              <Field
                label="対応時間"
                name={`room-service-hours-${index}`}
                value={entry.hours}
                onChange={(value) =>
                  setRoomServiceEntries((current) => updateItem(current, index, { hours: value }))
                }
                placeholder="18:00-22:00"
              />
            </div>
            <NotePairsField
              label="補足"
              entries={entry.notes}
              onChange={(value) =>
                setRoomServiceEntries((current) => updateItem(current, index, { notes: value }))
              }
            />
          </EntryCard>
        ))}
      </SectionBlock>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-none bg-[var(--accent)] px-5 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "送信中..." : submitLabel}
      </button>

      {error ? <p className="rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {success ? (
        <p className="rounded-none border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>
      ) : null}
    </form>
  );
}

function sanitizeList<T extends Record<string, string>>(items: T[], keys: Array<keyof T>) {
  return items
    .map((item) => {
      const normalized = { ...item };
      for (const key of keys) {
        normalized[key] = item[key].trim() as T[keyof T];
      }
      return normalized;
    })
    .filter((item) => keys.some((key) => item[key]));
}

function sanitizeNoteItems(items: NoteItem[]) {
  return items
    .map((item) => ({
      label: item.label.trim(),
      content: item.content.trim(),
    }))
    .filter((item) => item.label || item.content);
}

function trimStringFields<T extends Record<string, unknown>>(item: T): T {
  const normalized = { ...item };

  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === "string") {
      normalized[key as keyof T] = value.trim() as T[keyof T];
    }
  }

  return normalized;
}

function updateItem<T>(items: T[], index: number, patch: Partial<T>) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function updateNoteItem(items: NoteItem[], index: number, patch: Partial<NoteItem>) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function NotePairsField({
  label,
  entries,
  onChange,
  inputClassName = "",
  buttonClassName = "",
  hideLabel = false,
}: {
  label: string;
  entries: NoteItem[];
  onChange: (value: NoteItem[]) => void;
  inputClassName?: string;
  buttonClassName?: string;
  hideLabel?: boolean;
}) {
  const safeEntries = entries.length > 0 ? entries : [{ ...EMPTY_NOTE_ITEM }];

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        {hideLabel ? <div /> : <p className="text-sm text-stone-700">{label}</p>}
        <button
          type="button"
          onClick={() => onChange([...safeEntries, { ...EMPTY_NOTE_ITEM }])}
          className={`inline-flex items-center rounded-none border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-500 transition hover:bg-stone-100 ${buttonClassName}`}
        >
          項目を追加
        </button>
      </div>
      <div className="grid gap-2">
        {safeEntries.map((entry, index) => (
          <div key={`note-${index}`} className="grid gap-2 md:grid-cols-[0.9fr_1.1fr_auto]">
            <Field
              label="項目"
              name={`note-label-${index}`}
              value={entry.label}
              onChange={(value) => onChange(updateNoteItem(safeEntries, index, { label: value }))}
              placeholder="例: 接続手順"
              inputClassName={inputClassName}
            />
            <Field
              label="内容"
              name={`note-content-${index}`}
              value={entry.content}
              onChange={(value) => onChange(updateNoteItem(safeEntries, index, { content: value }))}
              placeholder="例: パスワード入力後に部屋番号を選択"
              inputClassName={inputClassName}
            />
            {safeEntries.length > 1 ? (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onChange(safeEntries.filter((_, itemIndex) => itemIndex !== index))}
                  className={`mb-0.5 inline-flex h-[28px] items-center rounded-none border border-stone-200 bg-stone-50 px-2 text-[10px] font-medium text-stone-500 transition hover:bg-stone-100 ${buttonClassName}`}
                >
                  削除
                </button>
              </div>
            ) : (
              <div />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  description,
  addLabel,
  className = "",
  addButtonClassName = "",
  childrenClassName = "divide-y divide-stone-200 border border-stone-200 bg-white",
  onAdd,
  children,
}: {
  title: string;
  description: string;
  addLabel: string;
  className?: string;
  addButtonClassName?: string;
  childrenClassName?: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`grid gap-4 rounded-none border border-stone-200 bg-stone-50 p-4 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-900">{title}</p>
          <p className="mt-1 text-xs leading-6 text-stone-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className={`inline-flex items-center rounded-none border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] font-medium text-stone-500 transition hover:bg-stone-100 ${addButtonClassName}`}
        >
          {addLabel}
        </button>
      </div>
      <div className={childrenClassName}>{children}</div>
    </section>
  );
}

function EntryCard({
  children,
  canRemove,
  removeLabel,
  summary,
  onRemove,
}: {
  children: React.ReactNode;
  canRemove: boolean;
  removeLabel: string;
  summary: React.ReactNode;
  onRemove: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{summary}</div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="inline-flex items-center rounded-none border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] font-medium text-stone-500 transition hover:bg-stone-100"
          >
            {isExpanded ? "閉じる" : "+詳細"}
          </button>
          {canRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center rounded-none border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] font-medium text-stone-500 transition hover:bg-stone-100"
            >
              {removeLabel}
            </button>
          ) : null}
        </div>
      </div>
      {isExpanded ? <div className="mt-4 border-t border-stone-200 pt-4">{children}</div> : null}
    </div>
  );
}

function SectionHeaderRow({ columns }: { columns: string[] }) {
  return (
    <div
      className="hidden bg-stone-50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500 md:grid"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((column) => (
        <span key={column}>{column}</span>
      ))}
    </div>
  );
}

function SummaryGrid({ columns }: { columns: string[] }) {
  return (
    <div
      className="grid gap-3 text-sm text-stone-700"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((column, index) => (
        <p key={`${index}-${column}`} className="truncate">
          {column}
        </p>
      ))}
    </div>
  );
}

function summarizeNotes(notes: NoteItem[]) {
  const items = sanitizeNoteItems(notes);
  if (items.length === 0) {
    return "未入力";
  }

  return `${items.length}件`;
}

function Field({
  label,
  name,
  defaultValue,
  value,
  onChange,
  required,
  placeholder,
  inputClassName = "",
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  inputClassName?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-stone-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
        className={`rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-stone-400 ${inputClassName}`}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  selectClassName = "",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  selectClassName?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-stone-700">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-stone-400 ${selectClassName}`}
      >
        {options.map((option) => (
          <option key={option || "empty"} value={option}>
            {option || "選択してください"}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  value,
  onChange,
  placeholder,
  rows = 4,
  textareaClassName = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  textareaClassName?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-stone-700">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
        rows={rows}
        className={`rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-stone-400 ${textareaClassName}`}
      />
    </label>
  );
}
