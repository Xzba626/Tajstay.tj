import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const logLevel: ("query" | "error" | "warn")[] =
  process.env.PRISMA_LOG_QUERIES === "1" ? ["query", "error", "warn"] : ["error", "warn"];

/** Один PrismaClient на процесс (Next.js dev hot reload + long-running Node). */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevel
  });

globalForPrisma.prisma = prisma;

