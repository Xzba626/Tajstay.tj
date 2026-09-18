import { NextRequest } from "next/server";
import { deviceHeartbeat } from "@/lib/local-vault/heartbeat";
import { lvCatch, lvJsonOk } from "@/lib/local-vault/http";

export async function POST(req: NextRequest) {
  try {
    const rawBody = Buffer.from(await req.arrayBuffer());
    const result = await deviceHeartbeat(req, rawBody);
    return lvJsonOk(result, 200);
  } catch (e) {
    return lvCatch(e);
  }
}
