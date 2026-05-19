export type ImageUploadErrorCode =
  | "unsupported_type"
  | "too_large"
  | "empty"
  | "store_readonly"
  | "store_failed"
  | "blob_not_configured";

export class ImageUploadError extends Error {
  code: ImageUploadErrorCode;

  constructor(code: ImageUploadErrorCode, message: string) {
    super(message);
    this.name = "ImageUploadError";
    this.code = code;
  }
}
