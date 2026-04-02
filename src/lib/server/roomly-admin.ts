import "server-only";

import crypto from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

import { getFirebaseAdminServices, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { buildGuestRoomUrl, buildHearingSheetUrl } from "@/lib/server/roomly-links";

type HearingSheetNoteItem = {
  label: string;
  content: string;
};

export type Hotel = {
  id: string;
  name: string;
  plan: string;
  createdAt: string | null;
  hotelAdminEmail?: string;
};

export type Room = {
  id: string;
  hotelId: string;
  roomNumber: string;
  displayName?: string;
  floor?: string;
  roomType?: string;
};

export type Stay = {
  id: string;
  hotelId: string;
  roomId: string;
  roomNumber?: string;
  roomDisplayName?: string;
  language?: string;
  isActive: boolean;
  checkIn: string | null;
  checkOut: string | null;
};

export type HearingSheetLink = {
  id: string;
  hotelId: string;
  token: string;
  url: string;
  status: string;
  createdAt: string | null;
  submittedAt?: string | null;
};

export type RoomQrRecord = {
  id: string;
  hotelId: string;
  roomId: string;
  roomNumber: string;
  guestUrl: string;
  qrSvg: string;
  generatedAt: string | null;
};

export type HearingSheetPayload = {
  contactName: string;
  contactEmail: string;
  frontDeskHours: string;
  wifiNetworks: {
    floor: string;
    ssid: string;
    password: string;
    notes: HearingSheetNoteItem[];
  }[];
  breakfastEntries: {
    style: string;
    hours: string;
    location: string;
    price: string;
    reservationRequired: string;
    notes: HearingSheetNoteItem[];
  }[];
  bathEntries: {
    name: string;
    hours: string;
    location: string;
    notes: HearingSheetNoteItem[];
  }[];
  facilityEntries: {
    name: string;
    hours: string;
    notes: HearingSheetNoteItem[];
  }[];
  facilityLocationEntries: {
    name: string;
    floor: string;
    notes: HearingSheetNoteItem[];
  }[];
  amenityEntries: {
    name: string;
    inRoom: string;
    availableOnRequest: string;
    price: string;
    notes: HearingSheetNoteItem[];
  }[];
  parkingEntries: {
    name: string;
    capacity: string;
    price: string;
    hours: string;
    reservationRequired: string;
    location: string;
    notes: HearingSheetNoteItem[];
  }[];
  emergencyEntries: {
    category: string;
    contact: string;
    steps: string;
    notes: HearingSheetNoteItem[];
  }[];
  faqEntries: {
    question: string;
    answer: string;
  }[];
  checkoutEntries: {
    time: string;
    method: string;
    keyReturnLocation: string;
    lateCheckoutPolicy: string;
    notes: HearingSheetNoteItem[];
  }[];
  roomServiceEntries: {
    menuName: string;
    price: string;
    orderMethod: string;
    hours: string;
    notes: HearingSheetNoteItem[];
  }[];
  transportEntries: {
    companyName: string;
    serviceType: string;
    phone: string;
    hours: string;
    priceNote: string;
    notes: HearingSheetNoteItem[];
  }[];
  nearbySpotEntries: {
    name: string;
    category: string;
    distance: string;
    hours: string;
    location: string;
    notes: HearingSheetNoteItem[];
  }[];
};

export type HearingSheetSummary = {
  hotelId: string;
  hotelName: string;
  contactName?: string;
  contactEmail?: string;
  updatedAt: string | null;
  submittedAt: string | null;
};

export type HearingSheetData = {
  hotelId: string;
  contactName: string;
  contactEmail: string;
  frontDeskHours: string;
  wifiNetworks: HearingSheetPayload["wifiNetworks"];
  breakfastEntries: HearingSheetPayload["breakfastEntries"];
  bathEntries: HearingSheetPayload["bathEntries"];
  facilityEntries: HearingSheetPayload["facilityEntries"];
  facilityLocationEntries: HearingSheetPayload["facilityLocationEntries"];
  amenityEntries: HearingSheetPayload["amenityEntries"];
  parkingEntries: HearingSheetPayload["parkingEntries"];
  emergencyEntries: HearingSheetPayload["emergencyEntries"];
  faqEntries: HearingSheetPayload["faqEntries"];
  checkoutEntries: HearingSheetPayload["checkoutEntries"];
  roomServiceEntries: HearingSheetPayload["roomServiceEntries"];
  transportEntries: HearingSheetPayload["transportEntries"];
  nearbySpotEntries: HearingSheetPayload["nearbySpotEntries"];
  updatedAt: string | null;
  submittedAt: string | null;
};

export type HotelProvisionInput = {
  hotelName: string;
  plan: string;
  hotelAdminEmail: string;
  temporaryPassword: string;
};

export type SuperAdminProvisionInput = {
  email: string;
  temporaryPassword: string;
  displayName?: string;
};

export type RoomImportInput = {
  roomNumber: string;
  displayName?: string;
  floor?: string;
  roomType?: string;
};

function timestampToIso(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

function parseNoteItems(noteEntries: unknown, legacyNote?: unknown) {
  if (Array.isArray(noteEntries)) {
    return noteEntries.map((entry) => ({
      label: String(entry?.label ?? ""),
      content: String(entry?.content ?? ""),
    }));
  }

  if (legacyNote) {
    return [
      {
        label: "補足",
        content: String(legacyNote),
      },
    ];
  }

  return [];
}

export async function listHotels() {
  if (!isFirebaseAdminConfigured()) {
    return [];
  }

  const { db } = getFirebaseAdminServices();
  const snapshot = await db.collection("hotels").orderBy("created_at", "desc").get();

  return snapshot.docs.map<Hotel>((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      name: String(data.name ?? ""),
      plan: String(data.plan ?? ""),
      createdAt: timestampToIso(data.created_at),
      hotelAdminEmail: data.hotel_admin_email ? String(data.hotel_admin_email) : undefined,
    };
  });
}

export async function getHotelById(hotelId: string) {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const { db } = getFirebaseAdminServices();
  const snapshot = await db.collection("hotels").doc(hotelId).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    name: String(data.name ?? ""),
    plan: String(data.plan ?? ""),
    createdAt: timestampToIso(data.created_at),
    hotelAdminEmail: data.hotel_admin_email ? String(data.hotel_admin_email) : undefined,
  } satisfies Hotel;
}

export async function listRooms(hotelId?: string) {
  if (!isFirebaseAdminConfigured()) {
    return [];
  }

  const { db } = getFirebaseAdminServices();
  let query = db.collection("rooms").orderBy("room_number");

  if (hotelId) {
    query = query.where("hotel_id", "==", hotelId).orderBy("room_number");
  }

  const snapshot = await query.get();

  return snapshot.docs.map<Room>((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      hotelId: String(data.hotel_id ?? ""),
      roomNumber: String(data.room_number ?? ""),
      displayName: data.display_name ? String(data.display_name) : undefined,
      floor: data.floor ? String(data.floor) : undefined,
      roomType: data.room_type ? String(data.room_type) : undefined,
    };
  });
}

export async function listActiveStays(hotelId?: string) {
  if (!isFirebaseAdminConfigured()) {
    return [];
  }

  const { db } = getFirebaseAdminServices();
  let query = db.collection("stays").where("is_active", "==", true).orderBy("check_in", "desc");

  if (hotelId) {
    query = query.where("hotel_id", "==", hotelId).orderBy("check_in", "desc");
  }

  const [staySnapshot, rooms] = await Promise.all([query.get(), listRooms(hotelId)]);
  const roomMap = new Map(rooms.map((room) => [room.id, room]));

  return staySnapshot.docs.map<Stay>((doc) => {
    const data = doc.data();
    const room = roomMap.get(String(data.room_id ?? ""));

    return {
      id: doc.id,
      hotelId: String(data.hotel_id ?? ""),
      roomId: String(data.room_id ?? ""),
      roomNumber: room?.roomNumber,
      roomDisplayName: room?.displayName,
      language: data.language ? String(data.language) : undefined,
      isActive: Boolean(data.is_active),
      checkIn: timestampToIso(data.check_in),
      checkOut: timestampToIso(data.check_out),
    };
  });
}

export async function issueHearingSheetLink(hotelId: string, baseUrlOverride?: string) {
  const hotel = await getHotelById(hotelId);

  if (!hotel) {
    throw new Error("対象ホテルが見つかりません。");
  }

  const { db } = getFirebaseAdminServices();
  const ref = db.collection("hearing_sheet_links").doc();
  const token = crypto.randomUUID();
  const url = buildHearingSheetUrl(token, baseUrlOverride);

  await ref.set({
    hearing_sheet_link_id: ref.id,
    hotel_id: hotelId,
    token,
    url,
    status: "active",
    created_at: FieldValue.serverTimestamp(),
  });

  return {
    id: ref.id,
    hotelId,
    token,
    url,
    status: "active",
  };
}

export async function getLatestHearingSheetLink(hotelId: string) {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const { db } = getFirebaseAdminServices();
  const snapshot = await db
    .collection("hearing_sheet_links")
    .where("hotel_id", "==", hotelId)
    .get();

  const doc = snapshot.docs
    .sort((left, right) => {
      const leftCreatedAt = timestampToMillis(left.data().created_at);
      const rightCreatedAt = timestampToMillis(right.data().created_at);

      return rightCreatedAt - leftCreatedAt;
    })
    .at(0);

  if (!doc) {
    return null;
  }

  const data = doc.data();

  return {
    id: doc.id,
    hotelId: String(data.hotel_id ?? ""),
    token: String(data.token ?? ""),
    url: String(data.url ?? ""),
    status: String(data.status ?? "active"),
    createdAt: timestampToIso(data.created_at),
    submittedAt: timestampToIso(data.submitted_at),
  } satisfies HearingSheetLink;
}

export async function getHearingSheetLinkByToken(token: string) {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const { db } = getFirebaseAdminServices();
  const snapshot = await db
    .collection("hearing_sheet_links")
    .where("token", "==", token)
    .limit(1)
    .get();

  const doc = snapshot.docs[0];

  if (!doc) {
    return null;
  }

  const data = doc.data();

  return {
    id: doc.id,
    hotelId: String(data.hotel_id ?? ""),
    token: String(data.token ?? ""),
    url: String(data.url ?? ""),
    status: String(data.status ?? "active"),
    createdAt: timestampToIso(data.created_at),
    submittedAt: timestampToIso(data.submitted_at),
  } satisfies HearingSheetLink;
}

export async function getHearingSheetByHotelId(hotelId: string): Promise<HearingSheetData | null> {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const { db } = getFirebaseAdminServices();
  const snapshot = await db.collection("hearing_sheets").doc(hotelId).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};

  return {
    hotelId,
    contactName: String(data.contact_name ?? ""),
    contactEmail: String(data.contact_email ?? ""),
    frontDeskHours: String(data.operations?.front_desk_hours ?? ""),
    wifiNetworks: Array.isArray(data.wifi?.networks)
      ? data.wifi.networks.map((entry: Record<string, unknown>) => ({
          floor: String(entry?.floor ?? ""),
          ssid: String(entry?.ssid ?? ""),
          password: String(entry?.password ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : data.wifi?.info || data.basic_info?.wifi_password
        ? [
            {
              floor: "全館",
              ssid: "",
              password: "",
              notes: parseNoteItems(undefined, data.wifi?.info ?? data.basic_info?.wifi_password),
            },
          ]
        : [],
    breakfastEntries: Array.isArray(data.facilities?.breakfast_entries)
      ? data.facilities.breakfast_entries.map((entry: Record<string, unknown>) => ({
          style: String(entry?.style ?? ""),
          hours: String(entry?.hours ?? ""),
          location: String(entry?.location ?? ""),
          price: String(entry?.price ?? ""),
          reservationRequired: String(entry?.reservation_required ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : data.facilities?.breakfast_info
        ? [
            {
              style: "",
              hours: "",
              location: "",
              price: "",
              reservationRequired: "",
              notes: parseNoteItems(undefined, data.facilities?.breakfast_info),
            },
          ]
        : [],
    bathEntries: Array.isArray(data.facilities?.bath_entries)
      ? data.facilities.bath_entries.map((entry: Record<string, unknown>) => ({
          name: String(entry?.name ?? ""),
          hours: String(entry?.hours ?? ""),
          location: String(entry?.location ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : data.facilities?.bath_info
        ? [
            {
              name: "大浴場・温泉",
              hours: "",
              location: "",
              notes: parseNoteItems(undefined, data.facilities?.bath_info),
            },
          ]
        : [],
    facilityEntries: Array.isArray(data.facilities?.entries)
      ? data.facilities.entries.map((entry: Record<string, unknown>) => ({
          name: String(entry?.name ?? ""),
          hours: String(entry?.hours ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : data.facilities?.general_info
        ? [
            {
              name: "",
              hours: "",
              notes: parseNoteItems(undefined, data.facilities?.general_info),
            },
          ]
        : [],
    facilityLocationEntries: Array.isArray(data.facilities?.location_entries)
      ? data.facilities.location_entries.map((entry: Record<string, unknown>) => ({
          name: String(entry?.name ?? ""),
          floor: String(entry?.floor ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : data.facilities?.location_info
        ? [
            {
              name: "",
              floor: "",
              notes: parseNoteItems(undefined, data.facilities?.location_info),
            },
          ]
        : [],
    amenityEntries: Array.isArray(data.amenities?.entries)
      ? data.amenities.entries.map((entry: Record<string, unknown>) => ({
          name: String(entry?.name ?? ""),
          inRoom: String(entry?.in_room ?? ""),
          availableOnRequest: String(entry?.available_on_request ?? ""),
          price: String(entry?.price ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : data.amenities?.info
        ? [
            {
              name: "",
              inRoom: "",
              availableOnRequest: "",
              price: "",
              notes: parseNoteItems(undefined, data.amenities?.info),
            },
          ]
        : [],
    parkingEntries: Array.isArray(data.facilities?.parking_entries)
      ? data.facilities.parking_entries.map((entry: Record<string, unknown>) => ({
          name: String(entry?.name ?? ""),
          capacity: String(entry?.capacity ?? ""),
          price: String(entry?.price ?? ""),
          hours: String(entry?.hours ?? ""),
          reservationRequired: String(entry?.reservation_required ?? ""),
          location: String(entry?.location ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : data.facilities?.parking_info
        ? [
            {
              name: "",
              capacity: "",
              price: "",
              hours: "",
              reservationRequired: "",
              location: "",
              notes: parseNoteItems(undefined, data.facilities?.parking_info),
            },
          ]
        : [],
    emergencyEntries: Array.isArray(data.emergency?.entries)
      ? data.emergency.entries.map((entry: Record<string, unknown>) => ({
          category: String(entry?.category ?? ""),
          contact: String(entry?.contact ?? ""),
          steps: String(entry?.steps ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : data.emergency?.note
        ? [
            {
              category: "",
              contact: "",
              steps: "",
              notes: parseNoteItems(undefined, data.emergency?.note),
            },
          ]
        : [],
    faqEntries: Array.isArray(data.faq_entries)
      ? data.faq_entries.map((entry: Record<string, unknown>) => ({
          question: String(entry?.question ?? ""),
          answer: String(entry?.answer ?? ""),
        }))
      : data.faq_info || data.custom_qa
        ? [
            {
              question: "",
              answer: String(data.faq_info ?? data.custom_qa ?? ""),
            },
          ]
        : [],
    checkoutEntries: Array.isArray(data.checkout?.entries)
      ? data.checkout.entries.map((entry: Record<string, unknown>) => ({
          time: String(entry?.time ?? ""),
          method: String(entry?.method ?? ""),
          keyReturnLocation: String(entry?.key_return_location ?? ""),
          lateCheckoutPolicy: String(entry?.late_checkout_policy ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : [],
    roomServiceEntries: Array.isArray(data.room_service?.entries)
      ? data.room_service.entries.map((entry: Record<string, unknown>) => ({
          menuName: String(entry?.menu_name ?? ""),
          price: String(entry?.price ?? ""),
          orderMethod: String(entry?.order_method ?? ""),
          hours: String(entry?.hours ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : [],
    transportEntries: Array.isArray(data.transport?.entries)
      ? data.transport.entries.map((entry: Record<string, unknown>) => ({
          companyName: String(entry?.company_name ?? ""),
          serviceType: String(entry?.service_type ?? ""),
          phone: String(entry?.phone ?? ""),
          hours: String(entry?.hours ?? ""),
          priceNote: String(entry?.price_note ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : [],
    nearbySpotEntries: Array.isArray(data.nearby_spots?.entries)
      ? data.nearby_spots.entries.map((entry: Record<string, unknown>) => ({
          name: String(entry?.name ?? ""),
          category: String(entry?.category ?? ""),
          distance: String(entry?.distance ?? ""),
          hours: String(entry?.hours ?? ""),
          location: String(entry?.location ?? ""),
          notes: parseNoteItems(entry?.note_entries, entry?.note),
        }))
      : [],
    updatedAt: timestampToIso(data.updated_at),
    submittedAt: timestampToIso(data.submitted_at),
  };
}

export async function getHearingSheetByToken(token: string) {
  const link = await getHearingSheetLinkByToken(token);

  if (!link || link.status !== "active") {
    return null;
  }

  const hotel = await getHotelById(link.hotelId);

  if (!hotel) {
    return null;
  }

  const existingSheet = await getHearingSheetByHotelId(link.hotelId);

  return {
    hotel,
    link,
    sheet: existingSheet,
  };
}

export async function submitHearingSheetByToken(token: string, payload: HearingSheetPayload) {
  const link = await getHearingSheetLinkByToken(token);

  if (!link || link.status !== "active") {
    throw new Error("有効なヒアリングシートURLではありません。");
  }

  const { db } = getFirebaseAdminServices();
  const now = FieldValue.serverTimestamp();
  const sheetRef = db.collection("hearing_sheets").doc(link.hotelId);
  const linkRef = db.collection("hearing_sheet_links").doc(link.id);
  const batch = db.batch();

  batch.set(
    sheetRef,
    {
      hotel_id: link.hotelId,
      contact_name: payload.contactName,
      contact_email: payload.contactEmail,
      operations: {
        front_desk_hours: payload.frontDeskHours,
      },
      wifi: {
        networks: payload.wifiNetworks,
      },
      facilities: {
        breakfast_entries: payload.breakfastEntries.map((entry) => ({
          style: entry.style,
          hours: entry.hours,
          location: entry.location,
          price: entry.price,
          reservation_required: entry.reservationRequired,
          note_entries: entry.notes,
        })),
        bath_entries: payload.bathEntries.map((entry) => ({
          ...entry,
          note_entries: entry.notes,
        })),
        entries: payload.facilityEntries.map((entry) => ({
          ...entry,
          note_entries: entry.notes,
        })),
        location_entries: payload.facilityLocationEntries.map((entry) => ({
          ...entry,
          note_entries: entry.notes,
        })),
        parking_entries: payload.parkingEntries.map((entry) => ({
          name: entry.name,
          capacity: entry.capacity,
          price: entry.price,
          hours: entry.hours,
          reservation_required: entry.reservationRequired,
          location: entry.location,
          note_entries: entry.notes,
        })),
      },
      amenities: {
        entries: payload.amenityEntries.map((entry) => ({
          name: entry.name,
          in_room: entry.inRoom,
          available_on_request: entry.availableOnRequest,
          price: entry.price,
          note_entries: entry.notes,
        })),
      },
      emergency: {
        entries: payload.emergencyEntries.map((entry) => ({
          ...entry,
          note_entries: entry.notes,
        })),
      },
      faq_entries: payload.faqEntries,
      checkout: {
        entries: payload.checkoutEntries.map((entry) => ({
          time: entry.time,
          method: entry.method,
          key_return_location: entry.keyReturnLocation,
          late_checkout_policy: entry.lateCheckoutPolicy,
          note_entries: entry.notes,
        })),
      },
      room_service: {
        entries: payload.roomServiceEntries.map((entry) => ({
          menu_name: entry.menuName,
          price: entry.price,
          order_method: entry.orderMethod,
          hours: entry.hours,
          note_entries: entry.notes,
        })),
      },
      transport: {
        entries: payload.transportEntries.map((entry) => ({
          company_name: entry.companyName,
          service_type: entry.serviceType,
          phone: entry.phone,
          hours: entry.hours,
          price_note: entry.priceNote,
          note_entries: entry.notes,
        })),
      },
      nearby_spots: {
        entries: payload.nearbySpotEntries.map((entry) => ({
          name: entry.name,
          category: entry.category,
          distance: entry.distance,
          hours: entry.hours,
          location: entry.location,
          note_entries: entry.notes,
        })),
      },
      source_token: token,
      source_link_id: link.id,
      submitted_at: now,
      updated_at: now,
    },
    { merge: true },
  );

  batch.set(
    linkRef,
    {
      submitted_at: now,
      last_submitted_by: payload.contactEmail,
      updated_at: now,
    },
    { merge: true },
  );

  await batch.commit();

  return {
    hotelId: link.hotelId,
    submitted: true,
  };
}

export async function saveHearingSheetByHotelId(hotelId: string, payload: HearingSheetPayload) {
  const hotel = await getHotelById(hotelId);

  if (!hotel) {
    throw new Error("対象ホテルが見つかりません。");
  }

  const { db } = getFirebaseAdminServices();
  const now = FieldValue.serverTimestamp();

  await db.collection("hearing_sheets").doc(hotelId).set(
    {
      hotel_id: hotelId,
      contact_name: payload.contactName,
      contact_email: payload.contactEmail,
      operations: {
        front_desk_hours: payload.frontDeskHours,
      },
      wifi: {
        networks: payload.wifiNetworks,
      },
      facilities: {
        breakfast_entries: payload.breakfastEntries.map((entry) => ({
          style: entry.style,
          hours: entry.hours,
          location: entry.location,
          price: entry.price,
          reservation_required: entry.reservationRequired,
          note_entries: entry.notes,
        })),
        bath_entries: payload.bathEntries.map((entry) => ({
          ...entry,
          note_entries: entry.notes,
        })),
        entries: payload.facilityEntries.map((entry) => ({
          ...entry,
          note_entries: entry.notes,
        })),
        location_entries: payload.facilityLocationEntries.map((entry) => ({
          ...entry,
          note_entries: entry.notes,
        })),
        parking_entries: payload.parkingEntries.map((entry) => ({
          name: entry.name,
          capacity: entry.capacity,
          price: entry.price,
          hours: entry.hours,
          reservation_required: entry.reservationRequired,
          location: entry.location,
          note_entries: entry.notes,
        })),
      },
      amenities: {
        entries: payload.amenityEntries.map((entry) => ({
          name: entry.name,
          in_room: entry.inRoom,
          available_on_request: entry.availableOnRequest,
          price: entry.price,
          note_entries: entry.notes,
        })),
      },
      emergency: {
        entries: payload.emergencyEntries.map((entry) => ({
          ...entry,
          note_entries: entry.notes,
        })),
      },
      faq_entries: payload.faqEntries,
      checkout: {
        entries: payload.checkoutEntries.map((entry) => ({
          time: entry.time,
          method: entry.method,
          key_return_location: entry.keyReturnLocation,
          late_checkout_policy: entry.lateCheckoutPolicy,
          note_entries: entry.notes,
        })),
      },
      room_service: {
        entries: payload.roomServiceEntries.map((entry) => ({
          menu_name: entry.menuName,
          price: entry.price,
          order_method: entry.orderMethod,
          hours: entry.hours,
          note_entries: entry.notes,
        })),
      },
      transport: {
        entries: payload.transportEntries.map((entry) => ({
          company_name: entry.companyName,
          service_type: entry.serviceType,
          phone: entry.phone,
          hours: entry.hours,
          price_note: entry.priceNote,
          note_entries: entry.notes,
        })),
      },
      nearby_spots: {
        entries: payload.nearbySpotEntries.map((entry) => ({
          name: entry.name,
          category: entry.category,
          distance: entry.distance,
          hours: entry.hours,
          location: entry.location,
          note_entries: entry.notes,
        })),
      },
      updated_at: now,
      submitted_at: now,
      last_updated_by: "super_admin",
    },
    { merge: true },
  );

  return {
    hotelId,
    submitted: true,
  };
}

export async function listHearingSheetSummaries() {
  if (!isFirebaseAdminConfigured()) {
    return [];
  }

  const [hotels, sheetsSnapshot] = await Promise.all([
    listHotels(),
    getFirebaseAdminServices().db.collection("hearing_sheets").orderBy("updated_at", "desc").get(),
  ]);

  const hotelMap = new Map(hotels.map((hotel) => [hotel.id, hotel]));

  return sheetsSnapshot.docs.map<HearingSheetSummary>((doc) => {
    const data = doc.data();
    const hotel = hotelMap.get(doc.id);

    return {
      hotelId: doc.id,
      hotelName: hotel?.name ?? doc.id,
      contactName: data.contact_name ? String(data.contact_name) : undefined,
      contactEmail: data.contact_email ? String(data.contact_email) : undefined,
      updatedAt: timestampToIso(data.updated_at),
      submittedAt: timestampToIso(data.submitted_at),
    };
  });
}

export async function generateRoomQrsForHotel(hotelId: string) {
  const hotel = await getHotelById(hotelId);

  if (!hotel) {
    throw new Error("対象ホテルが見つかりません。");
  }

  const rooms = await listRooms(hotelId);

  if (rooms.length === 0) {
    throw new Error("QRを生成する客室が登録されていません。");
  }

  const { db } = getFirebaseAdminServices();
  const records = await Promise.all(
    rooms.map(async (room) => {
      const guestUrl = buildGuestRoomUrl({
        hotel_id: room.hotelId,
        room_id: room.id,
        room_number: room.roomNumber,
      });
      const qrSvg = await QRCode.toString(guestUrl, {
        type: "svg",
        margin: 1,
        color: {
          dark: "#ad2218",
          light: "#ffffff",
        },
      });

      return {
        room,
        guestUrl,
        qrSvg,
      };
    }),
  );

  const batch = db.batch();

  for (const record of records) {
    const ref = db.collection("room_qrs").doc(record.room.id);

    batch.set(
      ref,
      {
        room_qr_id: ref.id,
        hotel_id: hotelId,
        room_id: record.room.id,
        room_number: record.room.roomNumber,
        guest_url: record.guestUrl,
        qr_svg: record.qrSvg,
        generated_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();

  return {
    generated: records.length,
  };
}

export async function listRoomQrs(hotelId: string) {
  if (!isFirebaseAdminConfigured()) {
    return [];
  }

  const { db } = getFirebaseAdminServices();
  const snapshot = await db
    .collection("room_qrs")
    .where("hotel_id", "==", hotelId)
    .orderBy("room_number")
    .get();

  return snapshot.docs.map<RoomQrRecord>((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      hotelId: String(data.hotel_id ?? ""),
      roomId: String(data.room_id ?? ""),
      roomNumber: String(data.room_number ?? ""),
      guestUrl: String(data.guest_url ?? ""),
      qrSvg: String(data.qr_svg ?? ""),
      generatedAt: timestampToIso(data.generated_at),
    };
  });
}

export async function generateRoomQrPdf(hotelId: string) {
  const hotel = await getHotelById(hotelId);

  if (!hotel) {
    throw new Error("対象ホテルが見つかりません。");
  }

  const rooms = await listRooms(hotelId);

  if (rooms.length === 0) {
    throw new Error("PDFを生成する客室が登録されていません。");
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 32;
  const columns = 2;
  const rowsPerPage = 3;
  const cardGap = 18;
  const cardWidth = (pageWidth - margin * 2 - cardGap) / columns;
  const cardHeight = 230;

  const roomPayloads = await Promise.all(
    rooms.map(async (room) => {
      const guestUrl = buildGuestRoomUrl({
        hotel_id: room.hotelId,
        room_id: room.id,
        room_number: room.roomNumber,
      });
      const qrDataUrl = await QRCode.toDataURL(guestUrl, {
        margin: 1,
        width: 360,
        color: {
          dark: "#ad2218",
          light: "#ffffff",
        },
      });

      return {
        room,
        guestUrl,
        qrDataUrl,
      };
    }),
  );

  for (let index = 0; index < roomPayloads.length; index += 1) {
    const pageIndex = Math.floor(index / (columns * rowsPerPage));
    const indexOnPage = index % (columns * rowsPerPage);
    const columnIndex = indexOnPage % columns;
    const rowIndex = Math.floor(indexOnPage / columns);
    const x = margin + columnIndex * (cardWidth + cardGap);
    const y = pageHeight - margin - (rowIndex + 1) * cardHeight - rowIndex * cardGap;

    while (pdf.getPageCount() <= pageIndex) {
      pdf.addPage([pageWidth, pageHeight]);
    }

    const page = pdf.getPage(pageIndex);
    const { room, guestUrl, qrDataUrl } = roomPayloads[index];
    const qrImage = await pdf.embedPng(qrDataUrl);

    page.drawRectangle({
      x,
      y,
      width: cardWidth,
      height: cardHeight,
      borderWidth: 1,
      borderColor: rgb(0.87, 0.77, 0.74),
      color: rgb(1, 1, 1),
    });

    page.drawText(hotel.name, {
      x: x + 16,
      y: y + cardHeight - 28,
      size: 13,
      font: boldFont,
      color: rgb(0.14, 0.09, 0.08),
    });

    page.drawText(`客室 ${room.roomNumber}${room.displayName ? ` / ${room.displayName}` : ""}`, {
      x: x + 16,
      y: y + cardHeight - 48,
      size: 16,
      font: boldFont,
      color: rgb(0.14, 0.09, 0.08),
    });

    if (room.floor) {
      page.drawText(`階数: ${room.floor}`, {
        x: x + 16,
        y: y + cardHeight - 66,
        size: 10,
        font,
        color: rgb(0.3, 0.26, 0.24),
      });
    }

    if (room.roomType) {
      page.drawText(`客室タイプ: ${room.roomType}`, {
        x: x + 16,
        y: y + cardHeight - 80,
        size: 10,
        font,
        color: rgb(0.3, 0.26, 0.24),
      });
    }

    page.drawImage(qrImage, {
      x: x + 40,
      y: y + 42,
      width: 120,
      height: 120,
    });

    page.drawText("ゲスト用URL", {
      x: x + 180,
      y: y + 136,
      size: 10,
      font: boldFont,
      color: rgb(0.14, 0.09, 0.08),
    });

    const wrapped = wrapText(guestUrl, 28);
    wrapped.slice(0, 6).forEach((line, lineIndex) => {
      page.drawText(line, {
        x: x + 180,
        y: y + 118 - lineIndex * 12,
        size: 8,
        font,
        color: rgb(0.3, 0.26, 0.24),
      });
    });
  }

  return pdf.save();
}

function wrapText(value: string, maxCharsPerLine: number) {
  const lines: string[] = [];

  for (let index = 0; index < value.length; index += maxCharsPerLine) {
    lines.push(value.slice(index, index + maxCharsPerLine));
  }

  return lines;
}

function timestampToMillis(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

export async function provisionHotelAdmin(input: HotelProvisionInput) {
  const { auth, db } = getFirebaseAdminServices();

  const hotelRef = db.collection("hotels").doc();
  const userRecord = await auth.createUser({
    email: input.hotelAdminEmail,
    password: input.temporaryPassword,
    emailVerified: false,
  });

  try {
    await auth.setCustomUserClaims(userRecord.uid, {
      role: "hotel_admin",
      hotel_id: hotelRef.id,
    });

    const batch = db.batch();

    batch.set(hotelRef, {
      hotel_id: hotelRef.id,
      name: input.hotelName,
      plan: input.plan,
      hotel_admin_email: input.hotelAdminEmail,
      created_at: FieldValue.serverTimestamp(),
    });

    batch.set(db.collection("users").doc(userRecord.uid), {
      user_id: userRecord.uid,
      hotel_id: hotelRef.id,
      hotel_name: input.hotelName,
      role: "hotel_admin",
      email: input.hotelAdminEmail,
      created_at: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return {
      hotelId: hotelRef.id,
      userId: userRecord.uid,
      email: input.hotelAdminEmail,
      role: "hotel_admin" as const,
    };
  } catch (error) {
    await auth.deleteUser(userRecord.uid);
    throw error;
  }
}

export async function importRoomsForHotel(hotelId: string, rooms: RoomImportInput[]) {
  const normalizedRooms = rooms.map((room) => ({
    roomNumber: room.roomNumber.trim(),
    displayName: room.displayName?.trim() || undefined,
    floor: room.floor?.trim() || undefined,
    roomType: room.roomType?.trim() || undefined,
  }));

  const duplicateNumbersInCsv = normalizedRooms.reduce<string[]>((duplicates, room, index, array) => {
    if (
      array.findIndex((candidate) => candidate.roomNumber === room.roomNumber) !== index &&
      !duplicates.includes(room.roomNumber)
    ) {
      duplicates.push(room.roomNumber);
    }

    return duplicates;
  }, []);

  if (duplicateNumbersInCsv.length > 0) {
    throw new Error(`CSV内で room_number が重複しています: ${duplicateNumbersInCsv.join(", ")}`);
  }

  const existingRooms = await listRooms(hotelId);
  const existingNumbers = new Set(existingRooms.map((room) => room.roomNumber));
  const conflictingNumbers = normalizedRooms
    .filter((room) => existingNumbers.has(room.roomNumber))
    .map((room) => room.roomNumber);

  if (conflictingNumbers.length > 0) {
    throw new Error(`このホテルには既に登録済みの客室があります: ${conflictingNumbers.join(", ")}`);
  }

  const { db } = getFirebaseAdminServices();
  const batch = db.batch();

  for (const room of normalizedRooms) {
    const ref = db.collection("rooms").doc();

    batch.set(ref, {
      room_id: ref.id,
      hotel_id: hotelId,
      room_number: room.roomNumber,
      display_name: room.displayName ?? null,
      floor: room.floor ?? null,
      room_type: room.roomType ?? null,
      created_at: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return { imported: normalizedRooms.length };
}

export async function createSequentialRoomsForHotel(hotelId: string, roomCount: number) {
  if (!Number.isInteger(roomCount) || roomCount < 1 || roomCount > 500) {
    throw new Error("roomCount は 1 から 500 の整数で指定してください。");
  }

  const rooms = Array.from({ length: roomCount }, (_, index) => ({
    roomNumber: String(101 + index),
  }));

  return importRoomsForHotel(hotelId, rooms);
}

export async function updateRoomDisplayName(
  hotelId: string,
  roomId: string,
  displayName: string | null,
) {
  const { db } = getFirebaseAdminServices();
  const roomRef = db.collection("rooms").doc(roomId);
  const snapshot = await roomRef.get();

  if (!snapshot.exists) {
    throw new Error("対象の客室が見つかりません。");
  }

  const data = snapshot.data() ?? {};

  if (String(data.hotel_id ?? "") !== hotelId) {
    throw new Error("対象ホテルに紐づかない客室です。");
  }

  await roomRef.set(
    {
      display_name: displayName?.trim() || null,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    roomId,
    hotelId,
    displayName: displayName?.trim() || null,
  };
}

export async function expireStay(stayId: string, reason: string) {
  const { db } = getFirebaseAdminServices();
  const stayRef = db.collection("stays").doc(stayId);
  const snapshot = await stayRef.get();

  if (!snapshot.exists) {
    throw new Error("対象の滞在データが見つかりません。");
  }

  await stayRef.set(
    {
      is_active: false,
      invalidated_at: FieldValue.serverTimestamp(),
      invalidation_reason: reason,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { stayId, invalidated: true };
}

export async function provisionSuperAdmin(input: SuperAdminProvisionInput) {
  const { auth, db } = getFirebaseAdminServices();
  const userRecord = await auth.createUser({
    email: input.email,
    password: input.temporaryPassword,
    emailVerified: false,
    displayName: input.displayName,
  });

  try {
    await auth.setCustomUserClaims(userRecord.uid, {
      role: "super_admin",
    });

    await db.collection("users").doc(userRecord.uid).set({
      user_id: userRecord.uid,
      role: "super_admin",
      email: input.email,
      display_name: input.displayName ?? null,
      created_at: FieldValue.serverTimestamp(),
    });

    return {
      userId: userRecord.uid,
      email: input.email,
      role: "super_admin" as const,
    };
  } catch (error) {
    await auth.deleteUser(userRecord.uid);
    throw error;
  }
}
