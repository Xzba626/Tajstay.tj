import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { saveUploadFile } from "@/lib/uploads/saveUpload";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

export async function saveProfileAvatar(userId: number, file: File): Promise<string> {
  if (!file || file.size <= 0) throw new ImageUploadError("empty", "File is empty.");
  if (file.size > MAX_INPUT_BYTES) throw new ImageUploadError("too_large", "File too large.");

  const input = Buffer.from(await file.arrayBuffer());
  const compressed = await sharp(input)
    .rotate()
    .resize(512, 512, { fit: "cover", position: "centre" })
    .webp({ quality: 82 })
    .toBuffer();

  const blob = new Blob([new Uint8Array(compressed)], { type: "image/webp" });
  const uploadFile = new File([blob], "avatar.webp", { type: "image/webp" });
  const url = await saveUploadFile(uploadFile, `profile-avatars/${userId}`, 2 * 1024 * 1024);

  await prisma.user.update({
    where: { id: userId },
    data: { image: url }
  });

  return url;
}
