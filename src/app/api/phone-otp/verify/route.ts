import { handlePhoneOtpVerify } from "@/lib/auth/phoneOtpHandlers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handlePhoneOtpVerify(req);
}
