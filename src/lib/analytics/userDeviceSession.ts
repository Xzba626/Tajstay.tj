import { prisma } from "@/lib/prisma";
import { getGeoFromRequestHeaders } from "@/lib/geo/ipGeo";
import { clientIpFromHeaders } from "@/lib/geo/clientIp";

export type ClientDeviceHints = {
  systemLanguage?: string | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
};

export async function upsertUserDeviceSession(
  userId: number,
  headers: Headers,
  client: ClientDeviceHints
): Promise<void> {
  const ip = clientIpFromHeaders(headers)?.slice(0, 64) ?? null;
  const userAgent = headers.get("user-agent")?.slice(0, 512) ?? null;
  const geo = await getGeoFromRequestHeaders(headers);

  const systemLanguage = client.systemLanguage?.trim().slice(0, 32) || null;
  const screenWidth =
    typeof client.screenWidth === "number" && Number.isFinite(client.screenWidth)
      ? Math.max(0, Math.floor(client.screenWidth))
      : null;
  const screenHeight =
    typeof client.screenHeight === "number" && Number.isFinite(client.screenHeight)
      ? Math.max(0, Math.floor(client.screenHeight))
      : null;

  const existing = await prisma.userDeviceSession.findFirst({
    where: {
      userId,
      userAgent,
      systemLanguage,
      screenWidth,
      screenHeight
    },
    orderBy: { lastSeenAt: "desc" }
  });

  const data = {
    ip,
    city: geo?.city ?? null,
    countryCode: geo?.countryCode ?? null,
    userAgent,
    systemLanguage,
    screenWidth,
    screenHeight,
    lastSeenAt: new Date()
  };

  if (existing) {
    await prisma.userDeviceSession.update({
      where: { id: existing.id },
      data
    });
    return;
  }

  await prisma.userDeviceSession.create({
    data: {
      userId,
      ...data
    }
  });
}
