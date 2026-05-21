import { NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { getOwnerOnboardingSteps } from "@/lib/services/ownerOnboarding";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const steps = await getOwnerOnboardingSteps(owner.id);
  return NextResponse.json({ steps });
}
