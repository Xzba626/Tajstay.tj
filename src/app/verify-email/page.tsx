import { verifyEmailByToken } from "@/lib/auth/emailVerification";
import { VerifyEmailClient } from "./VerifyEmailClient";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams?: { token?: string };
}) {
  const token = searchParams?.token?.trim();
  if (!token) {
    return <VerifyEmailClient status="missing" />;
  }

  const result = await verifyEmailByToken(token);
  return <VerifyEmailClient status={result} />;
}
