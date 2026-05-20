import { prisma } from "@/lib/prisma";

export type ProofMeta = {
  proofAmount: number | null;
  proofComment: string | null;
};

export async function getProofMetaFromLogs(bookingId: number): Promise<ProofMeta> {
  const log = await prisma.transactionLog.findFirst({
    where: { bookingId, type: "PAYMENT_PROOF_SUBMITTED" },
    orderBy: { createdAt: "desc" }
  });
  if (!log?.payload) return { proofAmount: null, proofComment: null };
  try {
    const parsed = JSON.parse(log.payload) as { proofAmount?: number | null; proofComment?: string | null };
    const amount =
      typeof parsed.proofAmount === "number" && Number.isFinite(parsed.proofAmount) ? parsed.proofAmount : null;
    const comment = typeof parsed.proofComment === "string" ? parsed.proofComment.trim() || null : null;
    return { proofAmount: amount, proofComment: comment };
  } catch {
    return { proofAmount: null, proofComment: null };
  }
}
