import { Suspense } from "react";
import StaffInviteClient from "./staff-invite-client";

export default function StaffInvitePage() {
  return (
    <Suspense fallback={<main className="p-8">…</main>}>
      <StaffInviteClient />
    </Suspense>
  );
}
