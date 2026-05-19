import { runAdminContentPost } from "@/lib/admin/content-route";
import { savePaymentCatalog } from "@/lib/site-content";

export async function POST(req: Request) {
  return runAdminContentPost(req, async () => {
    const form = await req.formData();
    const raw = String(form.get("methods") || "");
    const methods = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    await savePaymentCatalog({ methods });
  });
}
