import "server-only";

import crypto from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

import { getFirebaseAdminServices, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { buildGuestRoomUrl, buildHearingSheetUrl } from "@/lib/server/roomly-links";

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
  floor?: string;
  roomType?: string;
};

export type Stay = {
  id: string;
  hotelId: string;
  roomId: string;
  roomNumber?: string;
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
  checkInTime: string;
  checkOutTime: string;
  wifiPassword: string;
  breakfastInfo: string;
  parkingInfo: string;
  amenitiesInfo: string;
  emergencyNote: string;
  customQa: string;
};

export type HearingSheetSummary = {
  hotelId: string;
  hotelName: string;
  contactName?: string;
  contactEmail?: string;
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

export async function getHearingSheetByHotelId(hotelId: string) {
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
    checkInTime: String(data.basic_info?.check_in_time ?? ""),
    checkOutTime: String(data.basic_info?.check_out_time ?? ""),
    wifiPassword: String(data.basic_info?.wifi_password ?? ""),
    breakfastInfo: String(data.facilities?.breakfast_info ?? ""),
    parkingInfo: String(data.facilities?.parking_info ?? ""),
    amenitiesInfo: String(data.amenities?.info ?? ""),
    emergencyNote: String(data.emergency?.note ?? ""),
    customQa: String(data.custom_qa ?? ""),
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
      basic_info: {
        check_in_time: payload.checkInTime,
        check_out_time: payload.checkOutTime,
        wifi_password: payload.wifiPassword,
      },
      facilities: {
        breakfast_info: payload.breakfastInfo,
        parking_info: payload.parkingInfo,
      },
      amenities: {
        info: payload.amenitiesInfo,
      },
      emergency: {
        note: payload.emergencyNote,
      },
      custom_qa: payload.customQa,
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
      const guestUrl = buildGuestRoomUrl(room.id);
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
      const guestUrl = buildGuestRoomUrl(room.id);
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

    page.drawText(`客室 ${room.roomNumber}`, {
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
      floor: room.floor ?? null,
      room_type: room.roomType ?? null,
      created_at: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return { imported: normalizedRooms.length };
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
