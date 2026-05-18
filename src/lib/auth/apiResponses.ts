import { NextResponse } from "next/server";

export function forbiddenJson(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}
