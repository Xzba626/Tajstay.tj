import { saveUploadFile } from "@/lib/uploads/saveUpload";

const MAX_BYTES = 4 * 1024 * 1024;

/** Saves chat attachment; returns public URL (local path or Blob URL). */
export async function saveChatAttachmentFile(file: File, bookingId: number): Promise<string | null> {
  try {
    return await saveUploadFile(file, `chat-attachments/${bookingId}`, MAX_BYTES);
  } catch {
    return null;
  }
}
