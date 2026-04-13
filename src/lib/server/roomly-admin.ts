import "server-only";

import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";

import {
  getFirebaseAdminServices,
  getFirebaseStorageBucketCandidates,
  isFirebaseAdminConfigured,
} from "@/lib/server/firebase-admin";
import {
  type GuestRichMenuArea,
  type GuestRichMenuDoc,
  type GuestRichMenuUpsertInput,
  sortGuestRichMenuItems,
} from "@/lib/guest-rich-menu";
import {
  buildGuestRoomUrl,
  buildHearingSheetUrl,
  getGuestRoomUrlBase,
  getGuestRoomUrlHostname,
} from "@/lib/server/roomly-links";

type HearingSheetNoteItem = {
  label: string;
  content: string;
};

export type Hotel = {
  id: string;
  name: string;
  plan: string;
  createdAt: string | null;
  contractStartDate?: string;
  contractEndDate?: string;
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
  guestUrlHost: string;
  needsReplacement: boolean;
  qrSvg: string;
  generatedAt: string | null;
};

export type RoomQrReplacementAudit = {
  hotelId: string;
  hotelName: string;
  targetBaseUrl: string;
  targetHost: string;
  totalQrs: number;
  mismatchedCount: number;
  mismatchedRooms: Array<{
    roomId: string;
    roomNumber: string;
    guestUrl: string;
    guestUrlHost: string;
  }>;
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
  contractStartDate: string;
  contractEndDate: string;
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

type GuestRichMenuImageUploadInput = {
  hotelId: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
  imageWidth: number;
  imageHeight: number;
};

const ROOM_QR_DARK_HEX = "#000000";
const ROOM_QR_LIGHT_HEX = "#ffffff";

const LOCAL_GUEST_RICH_MENU_DIR = "guest-rich-menus";

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

function getUrlHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
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

function toGuestRichMenuArea(value: unknown, fallbackSortOrder: number): GuestRichMenuArea {
  const record = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(record.id ?? "").trim(),
    label: String(record.label ?? "").trim(),
    x: Number(record.x ?? 0),
    y: Number(record.y ?? 0),
    width: Number(record.width ?? 0),
    height: Number(record.height ?? 0),
    actionType:
      record.actionType === "handoff_category" ||
      record.actionType === "language" ||
      record.actionType === "ai_prompt" ||
      record.actionType === "ai_message" ||
      record.actionType === "human_handoff"
        ? record.actionType
        : "external_link",
    visible: record.visible !== false,
    sortOrder: Number.isFinite(Number(record.sortOrder)) ? Number(record.sortOrder) : fallbackSortOrder,
    url: typeof record.url === "string" ? record.url : undefined,
    prompt: typeof record.prompt === "string" ? record.prompt : undefined,
    handoffCategory: typeof record.handoffCategory === "string" ? record.handoffCategory : undefined,
    messageText: typeof record.messageText === "string" ? record.messageText : undefined,
    messageImageUrl: typeof record.messageImageUrl === "string" ? record.messageImageUrl : undefined,
    messageImageAlt: typeof record.messageImageAlt === "string" ? record.messageImageAlt : undefined,
    protectedTerms: Array.isArray(record.protectedTerms)
      ? record.protectedTerms.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : undefined,
    translations:
      record.translations && typeof record.translations === "object"
        ? Object.fromEntries(
            Object.entries(record.translations as Record<string, unknown>).map(([language, text]) => [
              language,
              typeof text === "string" ? text.trim() : "",
            ]),
          )
        : undefined,
  };
}

function buildGuestRichMenuImageUrl(bucketName: string, path: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function buildLocalGuestRichMenuImageUrl(relativePath: string) {
  return `/${relativePath.replace(/^\/+/, "")}`;
}

function parseStoragePathFromGuestRichMenuImageUrl(imageUrl: string) {
  if (!imageUrl) {
    return "";
  }

  try {
    const url = new URL(imageUrl);
    const matched = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/);
    return matched?.[1] ? decodeURIComponent(matched[1]) : "";
  } catch {
    return "";
  }
}

function getLocalGuestRichMenuFilePath(relativePath: string) {
  return path.join(process.cwd(), "public", relativePath.replace(/^\/+/, ""));
}

async function saveGuestRichMenuAssetLocally(input: GuestRichMenuImageUploadInput, extension: string) {
  const relativePath = `${LOCAL_GUEST_RICH_MENU_DIR}/${input.hotelId}/${Date.now()}.${extension}`;
  const absolutePath = getLocalGuestRichMenuFilePath(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.buffer);

  return {
    imageUrl: buildLocalGuestRichMenuImageUrl(relativePath),
    imageContentType: input.contentType,
    storagePath: `local:${relativePath}`,
    imageWidth: input.imageWidth,
    imageHeight: input.imageHeight,
  };
}

function normalizeGuestRichMenuImageUrl(imageUrl: string) {
  if (!imageUrl) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);

    if (url.hostname !== "firebasestorage.googleapis.com") {
      return imageUrl;
    }

    const matched = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);

    if (!matched) {
      return imageUrl;
    }

    const [, bucketName, encodedPath] = matched;
    const candidates = getFirebaseStorageBucketCandidates();
    const preferredBucket =
      candidates.find((candidate) => candidate.endsWith(".appspot.com")) ?? candidates[0] ?? bucketName;

    if (bucketName === preferredBucket) {
      return imageUrl;
    }

    return buildGuestRichMenuImageUrl(preferredBucket, decodeURIComponent(encodedPath), url.searchParams.get("token") ?? "");
  } catch {
    return imageUrl;
  }
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
      contractStartDate: data.contract_start_date ? String(data.contract_start_date) : undefined,
      contractEndDate: data.contract_end_date ? String(data.contract_end_date) : undefined,
      hotelAdminEmail: data.hotel_admin_email ? String(data.hotel_admin_email) : undefined,
    };
  });
}

export async function getGuestRichMenuByHotelId(hotelId: string): Promise<GuestRichMenuDoc | null> {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const { db } = getFirebaseAdminServices();
  const snapshot = await db.collection("guest_rich_menus").doc(hotelId).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    enabled: Boolean(data.enabled),
    version: Number.isFinite(Number(data.version)) ? Number(data.version) : 1,
    menuGuideText: data.menuGuideText ? String(data.menuGuideText) : undefined,
    translationProtectedTerms: Array.isArray(data.translationProtectedTerms)
      ? data.translationProtectedTerms.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [],
    imageUrl: normalizeGuestRichMenuImageUrl(String(data.imageUrl ?? "")),
    imageContentType: data.imageContentType ? String(data.imageContentType) : undefined,
    storagePath: data.storagePath
      ? String(data.storagePath)
      : parseStoragePathFromGuestRichMenuImageUrl(String(data.imageUrl ?? "")) || undefined,
    imageWidth: Number(data.imageWidth ?? 0),
    imageHeight: Number(data.imageHeight ?? 0),
    updatedAt: timestampToIso(data.updatedAt),
    items: sortGuestRichMenuItems(items.map((item, index) => toGuestRichMenuArea(item, index + 1))),
  };
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
    contractStartDate: data.contract_start_date ? String(data.contract_start_date) : undefined,
    contractEndDate: data.contract_end_date ? String(data.contract_end_date) : undefined,
    hotelAdminEmail: data.hotel_admin_email ? String(data.hotel_admin_email) : undefined,
  } satisfies Hotel;
}

export async function listRooms(hotelId?: string) {
  if (!isFirebaseAdminConfigured()) {
    return [];
  }

  const { db } = getFirebaseAdminServices();
  const query = hotelId
    ? db.collection("rooms").where("hotel_id", "==", hotelId).orderBy("room_number")
    : db.collection("rooms").orderBy("room_number");

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
  const query = hotelId
    ? db.collection("stays").where("is_active", "==", true).where("hotel_id", "==", hotelId).orderBy("check_in", "desc")
    : db.collection("stays").where("is_active", "==", true).orderBy("check_in", "desc");

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

export async function uploadGuestRichMenuImage(input: GuestRichMenuImageUploadInput) {
  const hotel = await getHotelById(input.hotelId);

  if (!hotel) {
    throw new Error("対象ホテルが見つかりません。");
  }

  const { storage } = getFirebaseAdminServices();
  const extension =
    input.contentType === "image/png" ? "png" : input.contentType === "image/webp" ? "webp" : "jpg";
  const token = crypto.randomUUID();
  const bucketNames = getFirebaseStorageBucketCandidates();
  const path = `guest-rich-menus/${input.hotelId}/${Date.now()}.${extension}`;
  let uploadedBucketName = "";

  for (const bucketName of bucketNames) {
    try {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(path);

      await file.save(input.buffer, {
        resumable: false,
        contentType: input.contentType,
        metadata: {
          cacheControl: "public,max-age=3600",
          metadata: {
            firebaseStorageDownloadTokens: token,
            hotelId: input.hotelId,
            originalFilename: input.filename,
          },
        },
      });

      uploadedBucketName = bucketName;
      break;
    } catch {}
  }

  if (!uploadedBucketName) {
    return saveGuestRichMenuAssetLocally(input, extension);
  }

  return {
    imageUrl: buildGuestRichMenuImageUrl(uploadedBucketName, path, token),
    imageContentType: input.contentType,
    imageWidth: input.imageWidth,
    imageHeight: input.imageHeight,
    storagePath: path,
  };
}

export async function saveGuestRichMenuByHotelId(hotelId: string, payload: GuestRichMenuUpsertInput) {
  const hotel = await getHotelById(hotelId);

  if (!hotel) {
    throw new Error("対象ホテルが見つかりません。");
  }

  const { db } = getFirebaseAdminServices();
  const ref = db.collection("guest_rich_menus").doc(hotelId);
  const existingSnapshot = await ref.get();
  const existingVersion = existingSnapshot.exists ? Number(existingSnapshot.data()?.version ?? 0) : 0;
  const nextVersion = Math.max(existingVersion + 1, Number(payload.version ?? 0) + 1, 1);

  await ref.set(
    {
      enabled: true,
      version: nextVersion,
      menuGuideText: payload.menuGuideText ?? null,
      translationProtectedTerms: payload.translationProtectedTerms ?? [],
      imageUrl: payload.imageUrl,
      imageContentType: payload.imageContentType ?? null,
      storagePath: payload.storagePath ?? null,
      imageWidth: payload.imageWidth,
      imageHeight: payload.imageHeight,
      updatedAt: FieldValue.serverTimestamp(),
      items: sortGuestRichMenuItems(payload.items).map((item) => ({
        id: item.id,
        label: item.label,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        actionType: item.actionType,
        visible: item.visible,
        sortOrder: item.sortOrder,
        url: item.url ?? null,
        prompt: item.prompt ?? null,
        handoffCategory: item.handoffCategory ?? null,
        messageText: item.messageText ?? null,
        messageImageUrl: item.messageImageUrl ?? null,
        messageImageAlt: item.messageImageAlt ?? null,
        protectedTerms: item.protectedTerms ?? [],
        translations: item.translations ?? null,
      })),
    },
    { merge: true },
  );

  const saved = await getGuestRichMenuByHotelId(hotelId);

  if (!saved) {
    throw new Error("guest rich menu の保存結果を取得できませんでした。");
  }

  return saved;
}

export async function getGuestRichMenuAsset(hotelId: string) {
  const menu = await getGuestRichMenuByHotelId(hotelId);

  if (!menu?.imageUrl) {
    throw new Error("プレビュー用アセットが見つかりません。");
  }

  const storagePath = menu.storagePath || parseStoragePathFromGuestRichMenuImageUrl(menu.imageUrl);

  if (!storagePath) {
    throw new Error("アセットの保存パスを特定できません。");
  }

  if (storagePath.startsWith("local:")) {
    const relativePath = storagePath.slice("local:".length);
    const buffer = await readFile(getLocalGuestRichMenuFilePath(relativePath));
    return {
      buffer,
      contentType: menu.imageContentType || "application/octet-stream",
    };
  }

  const { storage } = getFirebaseAdminServices();
  const bucketNames = getFirebaseStorageBucketCandidates();
  let lastError: unknown = null;

  for (const bucketName of bucketNames) {
    try {
      const [buffer] = await storage.bucket(bucketName).file(storagePath).download();
      return {
        buffer,
        contentType: menu.imageContentType || "application/octet-stream",
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("プレビュー用アセットの取得に失敗しました。");
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
          dark: ROOM_QR_DARK_HEX,
          light: ROOM_QR_LIGHT_HEX,
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

  const targetHost = getGuestRoomUrlHostname();
  const { db } = getFirebaseAdminServices();
  const snapshot = await db
    .collection("room_qrs")
    .where("hotel_id", "==", hotelId)
    .orderBy("room_number")
    .get();

  return snapshot.docs.map<RoomQrRecord>((doc) => {
    const data = doc.data();
    const guestUrl = String(data.guest_url ?? "");
    const guestUrlHost = getUrlHostname(guestUrl);

    return {
      id: doc.id,
      hotelId: String(data.hotel_id ?? ""),
      roomId: String(data.room_id ?? ""),
      roomNumber: String(data.room_number ?? ""),
      guestUrl,
      guestUrlHost,
      needsReplacement: Boolean(guestUrlHost) && guestUrlHost !== targetHost,
      qrSvg: String(data.qr_svg ?? ""),
      generatedAt: timestampToIso(data.generated_at),
    };
  });
}

export async function listRoomQrReplacementAudits() {
  if (!isFirebaseAdminConfigured()) {
    return [];
  }

  const targetBaseUrl = getGuestRoomUrlBase();
  const targetHost = getGuestRoomUrlHostname();
  const [hotels, snapshot] = await Promise.all([
    listHotels(),
    getFirebaseAdminServices().db.collection("room_qrs").get(),
  ]);

  const hotelMap = new Map(hotels.map((hotel) => [hotel.id, hotel.name]));
  const audits = new Map<string, RoomQrReplacementAudit>();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const hotelId = String(data.hotel_id ?? "");
    const roomId = String(data.room_id ?? "");
    const roomNumber = String(data.room_number ?? "");
    const guestUrl = String(data.guest_url ?? "");
    const guestUrlHost = getUrlHostname(guestUrl);
    const hotelName = hotelMap.get(hotelId) ?? hotelId;

    const audit =
      audits.get(hotelId) ??
      {
        hotelId,
        hotelName,
        targetBaseUrl,
        targetHost,
        totalQrs: 0,
        mismatchedCount: 0,
        mismatchedRooms: [],
      };

    audit.totalQrs += 1;

    if (guestUrlHost && guestUrlHost !== targetHost) {
      audit.mismatchedCount += 1;
      audit.mismatchedRooms.push({
        roomId,
        roomNumber,
        guestUrl,
        guestUrlHost,
      });
    }

    audits.set(hotelId, audit);
  }

  return Array.from(audits.values())
    .filter((audit) => audit.mismatchedCount > 0)
    .sort((left, right) => right.mismatchedCount - left.mismatchedCount || left.hotelName.localeCompare(right.hotelName));
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
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 32;
  const columns = 2;
  const rowsPerPage = 3;
  const cardGap = 18;
  const cardWidth = (pageWidth - margin * 2 - cardGap) / columns;
  const cardHeight = 230;
  const qrSize = 180;

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
          dark: ROOM_QR_DARK_HEX,
          light: ROOM_QR_LIGHT_HEX,
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
    const { qrDataUrl } = roomPayloads[index];
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

    page.drawImage(qrImage, {
      x: x + (cardWidth - qrSize) / 2,
      y: y + (cardHeight - qrSize) / 2,
      width: qrSize,
      height: qrSize,
    });
  }

  return pdf.save();
}

export async function generateSingleRoomQrPdf(hotelId: string, roomId: string) {
  const hotel = await getHotelById(hotelId);

  if (!hotel) {
    throw new Error("対象ホテルが見つかりません。");
  }

  const rooms = await listRooms(hotelId);
  const room = rooms.find((entry) => entry.id === roomId);

  if (!room) {
    throw new Error("対象の客室が見つかりません。");
  }

  const pdf = await PDFDocument.create();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const cardWidth = 340;
  const cardHeight = 330;
  const x = (pageWidth - cardWidth) / 2;
  const y = (pageHeight - cardHeight) / 2;
  const qrSize = 260;
  const page = pdf.addPage([pageWidth, pageHeight]);
  const guestUrl = buildGuestRoomUrl({
    hotel_id: room.hotelId,
    room_id: room.id,
    room_number: room.roomNumber,
  });
  const qrDataUrl = await QRCode.toDataURL(guestUrl, {
    margin: 1,
    width: 720,
    color: {
      dark: ROOM_QR_DARK_HEX,
      light: ROOM_QR_LIGHT_HEX,
    },
  });
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

  page.drawImage(qrImage, {
    x: x + (cardWidth - qrSize) / 2,
    y: y + (cardHeight - qrSize) / 2,
    width: qrSize,
    height: qrSize,
  });

  return pdf.save();
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
      contract_start_date: input.contractStartDate,
      contract_end_date: input.contractEndDate,
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

type FloorRoomCountInput = {
  floor: number;
  roomCount: number;
};

export async function createFloorBasedRoomsForHotel(hotelId: string, floors: FloorRoomCountInput[]) {
  if (!Array.isArray(floors) || floors.length === 0) {
    throw new Error("少なくとも1つの階を指定してください。");
  }

  const normalizedFloors = floors
    .map((entry) => ({
      floor: Number(entry.floor),
      roomCount: Number(entry.roomCount),
    }))
    .sort((left, right) => left.floor - right.floor);

  const seenFloors = new Set<number>();

  for (const entry of normalizedFloors) {
    if (!Number.isInteger(entry.floor) || entry.floor < 1 || entry.floor > 50) {
      throw new Error("floor は 1F から 50F の整数で指定してください。");
    }

    if (!Number.isInteger(entry.roomCount) || entry.roomCount < 1 || entry.roomCount > 99) {
      throw new Error("各階の roomCount は 1 から 99 の整数で指定してください。");
    }

    if (seenFloors.has(entry.floor)) {
      throw new Error("floor が重複しています。各階は1回だけ指定してください。");
    }

    seenFloors.add(entry.floor);
  }

  const totalRoomCount = normalizedFloors.reduce((sum, entry) => sum + entry.roomCount, 0);

  if (totalRoomCount > 500) {
    throw new Error("作成できる客室数は合計 500 室までです。");
  }

  const rooms = normalizedFloors.flatMap((entry) =>
    Array.from({ length: entry.roomCount }, (_, index) => ({
      roomNumber: String(entry.floor * 100 + index + 1),
      floor: `${entry.floor}F`,
    })),
  );

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
