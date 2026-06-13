import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { getInboxConversations, type InboxFilter } from "@/lib/chat/inbox";

const FILTERS = new Set<InboxFilter>([
  "all",
  "unread",
  "payment_pending",
  "on_review",
  "confirmed",
  "complaints",
  "admin"
]);

export async function GET(req: NextRequest) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "HOTEL_MODERATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = (req.nextUrl.searchParams.get("filter") ?? "all").trim() as InboxFilter;
  const filter = FILTERS.has(raw) ? raw : "all";

  const search = (req.nextUrl.searchParams.get("q") ?? "").trim();

  const items = await getInboxConversations({
    userId: user.id,
    role: user.role,
    filter,
    search
  });

  return NextResponse.json({ ok: true, filter, search, items });
}
