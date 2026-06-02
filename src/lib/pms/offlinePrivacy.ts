import { maskGuestContact } from "@/lib/pms/staff";

/** Fields safe for reception / staff without PII access */
export type OfflineBookingPublicView = {
  id: number;
  publicCode: string | null;
  guestName: string | null;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  offlineStatus: string | null;
  roomTypeName: string | null;
  roomLabel: string | null;
  hotelName: string | null;
};

export type OfflineBookingOwnerView = OfflineBookingPublicView & {
  guestPhone?: string;
  guestEmail?: string;
  totalPrice?: number;
  prepayment?: number;
  remainingAmount?: number;
  offlinePaymentType?: string | null;
  offlineNote?: string | null;
  guestDocumentUrl?: string | null;
};

type BookingShape = {
  id: number;
  publicCode: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  guestCount: number;
  checkIn: Date;
  checkOut: Date;
  offlineStatus: string | null;
  totalPrice: unknown;
  prepayment: unknown;
  remainingAmount: unknown;
  offlinePaymentType: string | null;
  offlineNote: string | null;
  guestDocumentUrl?: string | null;
  room?: { title: string; roomNumber?: string | null; hotel: { name: string } } | null;
  roomType?: { name: string; hotel: { name: string } } | null;
  assignedRoom?: { title: string; roomNumber?: string | null } | null;
};

function roomLabel(b: BookingShape): string | null {
  if (b.assignedRoom?.roomNumber) return b.assignedRoom.roomNumber;
  if (b.assignedRoom?.title) return b.assignedRoom.title;
  if (b.room?.roomNumber) return b.room.roomNumber;
  if (b.room?.title) return b.room.title;
  if (b.roomType?.name) return b.roomType.name;
  return null;
}

export function toOfflinePublicView(b: BookingShape): OfflineBookingPublicView {
  return {
    id: b.id,
    publicCode: b.publicCode,
    guestName: b.guestName?.trim() || null,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guestCount: b.guestCount,
    offlineStatus: b.offlineStatus,
    hotelName: b.room?.hotel?.name ?? b.roomType?.hotel?.name ?? null,
    roomTypeName: b.roomType?.name ?? b.room?.title ?? null,
    roomLabel: roomLabel(b)
  };
}

export function toOfflineOwnerView(b: BookingShape, canViewPii: boolean, canViewFinances: boolean): OfflineBookingOwnerView {
  const base = toOfflinePublicView(b);
  return {
    ...base,
    guestPhone: canViewPii ? maskGuestContact(b.guestPhone, true) : undefined,
    guestEmail: canViewPii ? maskGuestContact(b.guestEmail, true) : undefined,
    totalPrice: canViewFinances ? Number(b.totalPrice) : undefined,
    prepayment: canViewFinances ? Number(b.prepayment ?? 0) : undefined,
    remainingAmount: canViewFinances ? Number(b.remainingAmount ?? 0) : undefined,
    offlinePaymentType: canViewFinances ? b.offlinePaymentType : undefined,
    offlineNote: canViewPii ? b.offlineNote : undefined,
    guestDocumentUrl: canViewPii ? b.guestDocumentUrl ?? null : null
  };
}
