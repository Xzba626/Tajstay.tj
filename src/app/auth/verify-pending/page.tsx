import { VerifyPendingClient } from "./VerifyPendingClient";

export default function VerifyPendingPage({
  searchParams
}: {
  searchParams?: { email?: string };
}) {
  const initialEmail = String(searchParams?.email ?? "").trim().toLowerCase();
  return <VerifyPendingClient initialEmail={initialEmail} />;
}
