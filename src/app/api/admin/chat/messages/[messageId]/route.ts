import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { deleteChatMessageById } from "@/lib/chat/bookingChat";

/** Мягкое скрытие сообщения (запись и вложения остаются в БД / на диске). */
export async function DELETE(_: NextRequest, { params }: { params: { messageId: string } }) {
  const user = await requireUser(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messageId = Number.parseInt(String(params.messageId ?? "").trim(), 10);
  if (!Number.isFinite(messageId) || messageId < 1) {
    return NextResponse.json({ error: "Invalid messageId" }, { status: 400 });
  }

  const res = await deleteChatMessageById(messageId);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
