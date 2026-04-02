import { NextRequest, NextResponse } from "next/server";

import {
  saveHearingSheetByHotelId,
  type HearingSheetPayload,
} from "@/lib/server/roomly-admin";
import { requireSuperAdminRequest } from "@/lib/server/super-admin-auth";

export const runtime = "nodejs";

function parseNoteItems(items: unknown) {
  return Array.isArray(items)
    ? items
        .map((entry) => ({
          label: String(entry?.label ?? "").trim(),
          content: String(entry?.content ?? "").trim(),
        }))
        .filter((entry) => entry.label || entry.content)
    : [];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    await requireSuperAdminRequest(request);
    const { hotelId } = await params;
    const body = (await request.json()) as Partial<HearingSheetPayload>;

    const payload: HearingSheetPayload = {
      contactName: String(body.contactName ?? "").trim(),
      contactEmail: String(body.contactEmail ?? "").trim(),
      frontDeskHours: String(body.frontDeskHours ?? "").trim(),
      wifiNetworks: Array.isArray(body.wifiNetworks)
        ? body.wifiNetworks.map((entry) => ({
            floor: String(entry?.floor ?? "").trim(),
            ssid: String(entry?.ssid ?? "").trim(),
            password: String(entry?.password ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      breakfastEntries: Array.isArray(body.breakfastEntries)
        ? body.breakfastEntries.map((entry) => ({
            style: String(entry?.style ?? "").trim(),
            hours: String(entry?.hours ?? "").trim(),
            location: String(entry?.location ?? "").trim(),
            price: String(entry?.price ?? "").trim(),
            reservationRequired: String(entry?.reservationRequired ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      bathEntries: Array.isArray(body.bathEntries)
        ? body.bathEntries.map((entry) => ({
            name: String(entry?.name ?? "").trim(),
            hours: String(entry?.hours ?? "").trim(),
            location: String(entry?.location ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      facilityEntries: Array.isArray(body.facilityEntries)
        ? body.facilityEntries.map((entry) => ({
            name: String(entry?.name ?? "").trim(),
            hours: String(entry?.hours ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      facilityLocationEntries: Array.isArray(body.facilityLocationEntries)
        ? body.facilityLocationEntries.map((entry) => ({
            name: String(entry?.name ?? "").trim(),
            floor: String(entry?.floor ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      amenityEntries: Array.isArray(body.amenityEntries)
        ? body.amenityEntries.map((entry) => ({
            name: String(entry?.name ?? "").trim(),
            inRoom: String(entry?.inRoom ?? "").trim(),
            availableOnRequest: String(entry?.availableOnRequest ?? "").trim(),
            price: String(entry?.price ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      parkingEntries: Array.isArray(body.parkingEntries)
        ? body.parkingEntries.map((entry) => ({
            name: String(entry?.name ?? "").trim(),
            capacity: String(entry?.capacity ?? "").trim(),
            price: String(entry?.price ?? "").trim(),
            hours: String(entry?.hours ?? "").trim(),
            reservationRequired: String(entry?.reservationRequired ?? "").trim(),
            location: String(entry?.location ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      emergencyEntries: Array.isArray(body.emergencyEntries)
        ? body.emergencyEntries.map((entry) => ({
            category: String(entry?.category ?? "").trim(),
            contact: String(entry?.contact ?? "").trim(),
            steps: String(entry?.steps ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      faqEntries: Array.isArray(body.faqEntries)
        ? body.faqEntries.map((entry) => ({
            question: String(entry?.question ?? "").trim(),
            answer: String(entry?.answer ?? "").trim(),
          }))
        : [],
      checkoutEntries: Array.isArray(body.checkoutEntries)
        ? body.checkoutEntries.map((entry) => ({
            time: String(entry?.time ?? "").trim(),
            method: String(entry?.method ?? "").trim(),
            keyReturnLocation: String(entry?.keyReturnLocation ?? "").trim(),
            lateCheckoutPolicy: String(entry?.lateCheckoutPolicy ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      roomServiceEntries: Array.isArray(body.roomServiceEntries)
        ? body.roomServiceEntries.map((entry) => ({
            menuName: String(entry?.menuName ?? "").trim(),
            price: String(entry?.price ?? "").trim(),
            orderMethod: String(entry?.orderMethod ?? "").trim(),
            hours: String(entry?.hours ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      transportEntries: Array.isArray(body.transportEntries)
        ? body.transportEntries.map((entry) => ({
            companyName: String(entry?.companyName ?? "").trim(),
            serviceType: String(entry?.serviceType ?? "").trim(),
            phone: String(entry?.phone ?? "").trim(),
            hours: String(entry?.hours ?? "").trim(),
            priceNote: String(entry?.priceNote ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
      nearbySpotEntries: Array.isArray(body.nearbySpotEntries)
        ? body.nearbySpotEntries.map((entry) => ({
            name: String(entry?.name ?? "").trim(),
            category: String(entry?.category ?? "").trim(),
            distance: String(entry?.distance ?? "").trim(),
            hours: String(entry?.hours ?? "").trim(),
            location: String(entry?.location ?? "").trim(),
            notes: parseNoteItems(entry?.notes),
          }))
        : [],
    };

    if (!payload.contactName || !payload.contactEmail) {
      return NextResponse.json(
        { error: "担当者名、メールアドレスは必須です。" },
        { status: 400 },
      );
    }

    const result = await saveHearingSheetByHotelId(hotelId, payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ヒアリングシートの保存に失敗しました。" },
      { status: 500 },
    );
  }
}
