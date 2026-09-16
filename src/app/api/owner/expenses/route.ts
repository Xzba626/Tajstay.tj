import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import {
  createHotelExpense,
  listHotelExpenses,
  stopHotelExpense,
  updateHotelExpenseAmount
} from "@/lib/owner/analytics/expenseService";
import { moneyToFixed2 } from "@/lib/money/serializeDecimal";

export async function GET(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();
  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") ?? "");
  if (!hotelId) return NextResponse.json({ error: "invalid_hotel" }, { status: 400 });
  try {
    const rows = await listHotelExpenses(hotelId, owner.id);
    return NextResponse.json({
      ok: true,
      expenses: rows.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        recurrence: e.recurrence,
        status: e.status,
        currency: e.currency,
        currentAmount: moneyToFixed2(e.versions[0]?.amount ?? 0),
        effectiveFrom: e.versions[0]?.effectiveFrom?.toISOString() ?? null,
        versions: e.versions.map((v) => ({
          id: v.id,
          amount: moneyToFixed2(v.amount),
          effectiveFrom: v.effectiveFrom.toISOString(),
          effectiveUntil: v.effectiveUntil?.toISOString() ?? null
        }))
      }))
    });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") return forbiddenJson();
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();
  const body = await req.json().catch(() => ({}));
  const hotelId = Number(body.hotelId ?? 0);
  try {
    const expense = await createHotelExpense({
      hotelId,
      ownerId: owner.id,
      title: String(body.title ?? ""),
      category: String(body.category ?? "OTHER"),
      amount: Number(body.amount),
      recurrence: String(body.recurrence ?? "ONE_TIME"),
      effectiveFrom: body.effectiveFrom ? new Date(String(body.effectiveFrom)) : new Date()
    });
    return NextResponse.json({ ok: true, id: expense.id }, { status: 201 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "FORBIDDEN") return forbiddenJson();
    if (code.startsWith("INVALID")) return NextResponse.json({ error: code.toLowerCase() }, { status: 400 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();
  const body = await req.json().catch(() => ({}));
  const hotelId = Number(body.hotelId ?? 0);
  const expenseId = Number(body.expenseId ?? 0);
  const action = String(body.action ?? "update");
  try {
    if (action === "stop") {
      await stopHotelExpense({
        hotelId,
        ownerId: owner.id,
        expenseId,
        stopAt: body.stopAt ? new Date(String(body.stopAt)) : new Date()
      });
    } else {
      await updateHotelExpenseAmount({
        hotelId,
        ownerId: owner.id,
        expenseId,
        amount: Number(body.amount),
        effectiveFrom: body.effectiveFrom ? new Date(String(body.effectiveFrom)) : new Date(),
        title: body.title != null ? String(body.title) : undefined,
        category: body.category != null ? String(body.category) : undefined
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "FORBIDDEN") return forbiddenJson();
    if (code === "NOT_FOUND") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (code === "EFFECTIVE_BEFORE_CURRENT" || code.startsWith("INVALID")) {
      return NextResponse.json({ error: code.toLowerCase() }, { status: 400 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
