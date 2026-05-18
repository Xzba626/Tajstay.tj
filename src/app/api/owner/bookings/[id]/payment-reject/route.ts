import { NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";

/**
 * Отклонение чека выполняется через админские процессы.
 */
export async function POST() {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  return NextResponse.json({ error: "Только админ может отклонять чек" }, { status: 403 });
}
