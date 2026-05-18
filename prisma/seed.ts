import { prisma } from "../src/lib/prisma";
import { runDevSeed } from "../src/lib/seed/runDevSeed";

async function main() {
  const result = await runDevSeed();
  console.log("Dev seed OK:", result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
