/**
 * BLOCK DB-RECOVERY — real DB proof that the scheduled archive job skips a booking with a
 * still-OPEN dispute, and picks it up once that dispute is resolved.
 * Run: npx tsx scripts/test-block56d-archive-job.ts
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { findBookingsEligibleForChatArchive, archiveBookingChatToColdStorage } from "../src/lib/chat/bookingChat";

const prisma = new PrismaClient();
let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  PASS: ${label}`);
  else {
    console.error(`  FAIL: ${label}`);
    failures += 1;
  }
}

async function main() {
  const tag = Date.now();
  const owner = await prisma.user.create({ data: { name: "ArchJob Owner", email: `archjob-o-${tag}@t.local`, phone: `+992760${String(tag).slice(-6)}`, password: await hashPassword("x"), role: "OWNER", verified: true } });
  const guest = await prisma.user.create({ data: { name: "ArchJob Guest", email: `archjob-g-${tag}@t.local`, phone: `+992761${String(tag).slice(-6)}`, password: await hashPassword("x"), role: "GUEST", verified: true } });
  const hotel = await prisma.hotel.create({ data: { ownerId: owner.id, name: `ArchJob Hotel ${tag}`, city: "D", address: "a", description: "d", propertyType: "HOTEL", status: "APPROVED", latitude: 1, longitude: 1 } });
  const room = await prisma.room.create({ data: { hotelId: hotel.id, roomTypeId: null, roomNumber: `ARCHJOB-${tag}`, title: "r", price: 100, capacity: 2, amenities: "[]", status: "ACTIVE", availability: true } });

  // Old checkout (20 days ago), terminal status - eligible on age/status alone.
  const oldCheckout = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  const booking = await prisma.booking.create({
    data: {
      publicCode: `TJARCHJOB${tag}`, userId: guest.id, roomId: room.id, assignedRoomId: room.id,
      checkIn: new Date(oldCheckout.getTime() - 2 * 86400000), checkOut: oldCheckout,
      totalPrice: 100, commission: 10, subtotal: 90, serviceFee: 0, taxAmount: 0, currency: "TJS",
      paymentStatus: "PAID", payOnArrival: false, phone: "+992700000000", status: "COMPLETED"
    }
  });
  await prisma.chatMessage.create({ data: { bookingId: booking.id, senderId: guest.id, senderRole: "GUEST", senderName: "g", body: "old message", isArchived: false } });

  const dispute = await prisma.dispute.create({ data: { bookingId: booking.id, openedById: guest.id, againstId: owner.id, reason: "Archive-job dispute-awareness test", status: "OPEN" } });

  let eligible = await findBookingsEligibleForChatArchive(15);
  check("1. booking with an OPEN dispute is NOT in the eligible-for-archive list", !eligible.includes(booking.id));

  await prisma.dispute.update({ where: { id: dispute.id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
  eligible = await findBookingsEligibleForChatArchive(15);
  check("2. same booking IS eligible once the dispute is RESOLVED", eligible.includes(booking.id));

  const result = await archiveBookingChatToColdStorage(booking.id);
  check("3. archival actually processes the message", result.archivedRows === 1);
  const after = await prisma.booking.findUnique({ where: { id: booking.id }, select: { chatArchivedAt: true } });
  check("4. chatArchivedAt is now set", Boolean(after?.chatArchivedAt));

  console.log(failures === 0 ? "\n=== archive-job dispute-awareness: ALL PASS ===" : `\n=== archive-job dispute-awareness: ${failures} FAILURE(S) ===`);

  await prisma.dispute.deleteMany({ where: { bookingId: booking.id } });
  await prisma.chatMessage.deleteMany({ where: { bookingId: booking.id } });
  await prisma.booking.delete({ where: { id: booking.id } });
  await prisma.room.delete({ where: { id: room.id } });
  await prisma.hotel.delete({ where: { id: hotel.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, guest.id] } } });
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(failures > 0 ? 1 : 0))
  .catch(async (e) => {
    console.error("FATAL:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
