import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
async function main() {
  console.log("hasAdminAudit", typeof (p as { adminAuditLog?: unknown }).adminAuditLog);
  try {
    const r = await p.adminAuditLog.create({ data: { action: "probe", result: "ok" } });
    console.log("created", r.id);
    await p.adminAuditLog.delete({ where: { id: r.id } });
    console.log("deleted_ok");
  } catch (e) {
    console.error("ERR", e instanceof Error ? e.message : e);
  } finally {
    await p.$disconnect();
  }
}
main();
