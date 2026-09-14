import { NextRequest } from "next/server";
import { authorizeBookingFileRequest } from "@/lib/uploads/fileRouteHelpers";
import { servePrivateFile } from "@/lib/uploads/servePrivateFile";

export async function GET(req: NextRequest, { params }: { params: { bookingId: string } }) {
  const result = await authorizeBookingFileRequest(req, params.bookingId, "proof");
  if ("response" in result) return result.response;
  return servePrivateFile(result.booking.paymentProofUrl);
}
