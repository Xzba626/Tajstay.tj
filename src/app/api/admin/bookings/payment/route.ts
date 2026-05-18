import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const id = Number(form.get("id"));
  const paymentStatus = String(form.get("paymentStatus"));
  if (!id || !["PENDING", "PAID", "FAILED", "REFUNDED"].includes(paymentStatus)) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { payment: true }
  });
  if (!booking) return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));

  // Guard against "fake paid" without any verifiable evidence.
  if (paymentStatus === "PAID") {
    const hasReviewedProof = !!booking.paymentProofUrl && !!booking.proofReviewedAt;
    const hasCapturedPayment = booking.payment?.status === "CAPTURED";
    if (!hasReviewedProof && !hasCapturedPayment) {
      return NextResponse.redirect(publicUrl(req, "/dashboard/admin?error=payment_requires_proof"));
    }
  }

  await prisma.booking.update({
    where: { id },
    data: { paymentStatus: paymentStatus as "PENDING" | "PAID" | "FAILED" | "REFUNDED" }
  });

  const payment = booking.payment;
  if (payment) {
    const nextPaymentStatus =
      paymentStatus === "PAID"
        ? "CAPTURED"
        : paymentStatus === "FAILED"
          ? "FAILED"
          : paymentStatus === "REFUNDED"
            ? "REFUNDED"
            : "PENDING";

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: nextPaymentStatus }
    });

    if (paymentStatus === "REFUNDED") {
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          reason: "Admin refund",
          status: "SENT",
          sentAt: new Date()
        }
      });
    }

    await prisma.transactionLog.create({
      data: {
        bookingId: id,
        paymentId: payment.id,
        type: "PAYMENT_STATUS_UPDATED",
          payload: JSON.stringify({ byAdminId: admin.id, bookingPaymentStatus: paymentStatus, paymentStatus: nextPaymentStatus })
      }
    });
  }

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
}
