export type OwnerApplicationUploads = {
  identity?: string;
  identityBack?: string;
  selfie?: string;
  facade?: string;
  room?: string;
  bathroom?: string;
  propertyDoc?: string;
  extraPhotos?: string[];
};

export type OwnerApplicationMeta = {
  applicantType: string;
  city: string;
  propertyType: string;
  address: string;
  roomCount?: string;
  guestCapacity?: string;
  propertyDescription?: string;
  experience?: string;
  houseRules?: string;
  uploads?: OwnerApplicationUploads;
  consentAt: string;
};

export function parseOwnerApplicationMeta(raw: unknown): OwnerApplicationMeta | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as OwnerApplicationMeta;
}
