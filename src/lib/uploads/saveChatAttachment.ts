import { saveUploadFile } from "@/lib/uploads/saveUpload";

const MAX_BYTES = 4 * 1024 * 1024;

/** Saves a chat attachment privately; returns a bare pathname (never a fetchable URL) - only
 * `/api/files/booking/[bookingId]/chat/[messageId]` may resolve it to bytes, after its own
 * per-request authorization check. */
export async function saveChatAttachmentFile(file: File, bookingId: number): Promise<string | null> {
  try {
    return await saveUploadFile(file, `chat-attachments/${bookingId}`, MAX_BYTES, "private");
  } catch {
    return null;
  }
}
