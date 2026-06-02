import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { saveOwnerPmsSettings, type OfflineSyncInterval } from "@/lib/pms/ownerPmsSettings";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const form = await req.formData();
  const offlineCloudSync = form.get("offlineCloudSync") === "1";
  const offlineBackupEmail = form.get("offlineBackupEmail") === "1";
  const offlineBackupTelegram = form.get("offlineBackupTelegram") === "1";
  const rawInterval = String(form.get("offlineSyncInterval") ?? "off");
  const offlineSyncInterval = (
    ["off", "15m", "1h", "24h"].includes(rawInterval) ? rawInterval : "off"
  ) as OfflineSyncInterval;

  await saveOwnerPmsSettings(owner.id, {
    offlineCloudSync,
    offlineBackupEmail,
    offlineBackupTelegram,
    offlineSyncInterval
  });

  const u = publicUrl(req, "/dashboard/owner");
  u.searchParams.set("section", "offline-bookings");
  u.searchParams.set("sync", "1");
  return NextResponse.redirect(u);
}
