import { saveUploadFile } from "@/lib/uploads/saveUpload";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import {
  OWNER_DOCUMENT_MAX_BYTES,
  OWNER_DOCUMENT_MIME_TYPES,
  OWNER_PHOTO_MAX_BYTES,
  OWNER_PHOTO_MIME_TYPES,
  validateOwnerDocumentFile,
  validateOwnerPhotoFile
} from "@/lib/owner/applicationUpload";

const DOCUMENT_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
};

function documentExtFromName(name: string): string | "" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || ext === "doc" || ext === "docx") return ext;
  return "";
}

/** Save owner-application photo with 10MB limit and image MIME check. */
export async function saveOwnerApplicationPhoto(file: File, storagePath: string): Promise<string> {
  const err = validateOwnerPhotoFile(file);
  if (err === "type") throw new ImageUploadError("unsupported_type", "Only JPG, PNG, and WebP photos are allowed.");
  if (err === "size") throw new ImageUploadError("too_large", "Photo exceeds 10MB limit.");
  return saveUploadFile(file, storagePath, OWNER_PHOTO_MAX_BYTES);
}

/** Save owner-application document (PDF/DOC/DOCX) with 20MB limit. */
export async function saveOwnerApplicationDocument(file: File, storagePath: string): Promise<string> {
  const err = validateOwnerDocumentFile(file);
  if (err === "type") throw new ImageUploadError("unsupported_type", "Only PDF, DOC, and DOCX documents are allowed.");
  if (err === "size") throw new ImageUploadError("too_large", "Document exceeds 20MB limit.");

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > OWNER_DOCUMENT_MAX_BYTES) {
    throw new ImageUploadError("too_large", "Document exceeds 20MB limit.");
  }

  const ext =
    DOCUMENT_EXT[file.type] ||
    documentExtFromName(file.name) ||
    (OWNER_DOCUMENT_MIME_TYPES.includes(file.type as (typeof OWNER_DOCUMENT_MIME_TYPES)[number]) ? "pdf" : "");

  if (!ext) throw new ImageUploadError("unsupported_type", "Only PDF, DOC, and DOCX documents are allowed.");

  // Reuse saveUploadFile pipeline by wrapping with corrected MIME for PDF path
  const normalized =
    file.type && DOCUMENT_EXT[file.type]
      ? file
      : new File([buffer], file.name.replace(/\.\w+$/, "") + `.${ext}`, {
          type:
            ext === "pdf"
              ? "application/pdf"
              : ext === "docx"
                ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                : "application/msword"
        });

  return saveUploadFile(normalized, storagePath, OWNER_DOCUMENT_MAX_BYTES);
}
