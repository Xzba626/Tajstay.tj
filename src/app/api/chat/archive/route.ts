import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import {
  archiveBookingChatToColdStorage,
  findBookingsEligibleForChatArchive,
  runChatArchiveJob
} from "@/lib/chat/bookingChat";

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * Помечает сообщения как архивные (isArchived) для брони или запускает пакет по политике 15 дней.
 * Доступ: ADMIN или Bearer CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  const admin = await requireUser(["ADMIN"]);
  if (!admin && !cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { bookingId?: unknown; runEligible?: unknown };
  const bookingId = Number.parseInt(String(body.bookingId ?? "").trim(), 10);
  const runEligible = body.runEligible === true;

  if (runEligible) {
    const result = await runChatArchiveJob();
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  }

  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  const { archivedRows } = await archiveBookingChatToColdStorage(bookingId);
  return NextResponse.json({ ok: true, bookingId, archivedRows }, { status: 200 });
}

/** Список ID броней, подпадающих под автоархив (без изменений данных). */
export async function GET(req: NextRequest) {
  const admin = await requireUser(["ADMIN"]);
  if (!admin && !cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Number.parseInt(String(req.nextUrl.searchParams.get("days") ?? "15"), 10);
  const ids = await findBookingsEligibleForChatArchive(Number.isFinite(days) && days > 0 ? days : 15);
  return NextResponse.json({ ok: true, eligibleBookingIds: ids }, { status: 200 });
}
