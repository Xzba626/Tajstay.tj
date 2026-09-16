import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.findFirst({ where: { email: "owner@tajstay.local" } });
  if (!owner) throw new Error("no owner");
  const hotel = await prisma.hotel.findFirst({ where: { ownerId: owner.id, status: "APPROVED" } });
  if (!hotel) throw new Error("no hotel");

  const method = await prisma.hotelPaymentMethod.create({
    data: {
      hotelId: hotel.id,
      type: "CARD",
      displayLabel: "B6-V1-Humo",
      recipientName: "Owner V1",
      paymentIdentifier: "1111222233334444",
      instructions: "V1 only",
      isActive: true,
      sortOrder: 99
    }
  });

  const snap = {
    displayLabel: method.displayLabel,
    recipientName: method.recipientName,
    paymentIdentifier: method.paymentIdentifier,
    instructions: method.instructions
  };

  const booking =
    (await prisma.booking.findFirst({
      where: {
        OR: [{ room: { hotelId: hotel.id } }, { assignedRoom: { hotelId: hotel.id } }]
      },
      orderBy: { id: "desc" }
    })) ?? (await prisma.booking.findFirst({ orderBy: { id: "desc" } }));

  if (!booking) throw new Error("no booking fixture for snapshot proof");

  await prisma.booking.update({
    where: { id: booking.id },
    data: { hotelPaymentMethodId: method.id, paymentMethodSnapshot: snap }
  });

  await prisma.hotelPaymentMethod.update({
    where: { id: method.id },
    data: {
      displayLabel: "B6-V2-Humo",
      paymentIdentifier: "9999888877776666",
      instructions: "V2"
    }
  });

  const after = await prisma.booking.findUnique({
    where: { id: booking.id },
    select: { id: true, paymentMethodSnapshot: true }
  });
  const methodNow = await prisma.hotelPaymentMethod.findUnique({ where: { id: method.id } });
  const snapObj = after?.paymentMethodSnapshot as { displayLabel?: string } | null;

  const immutable =
    Boolean(after) && snapObj?.displayLabel === "B6-V1-Humo" && methodNow?.displayLabel === "B6-V2-Humo";

  console.log(
    JSON.stringify(
      {
        bookingId: after?.id ?? null,
        snapLabel: snapObj?.displayLabel ?? null,
        methodLabel: methodNow?.displayLabel ?? null,
        immutable
      },
      null,
      2
    )
  );

  if (!immutable) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
