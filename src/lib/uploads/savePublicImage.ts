import { saveUploadFile } from "@/lib/uploads/saveUpload";

const MAX_BYTES = 5 * 1024 * 1024;

export type UploadSubdir = "hotel-covers" | "room-photos";

/** Saves hotel/room images for public URLs. */
export async function savePublicImageFile(file: File, subdir: UploadSubdir): Promise<string> {
  return saveUploadFile(file, subdir, MAX_BYTES);
}
