import { runAdminContentPost } from "@/lib/admin/content-route";
import { saveBrandSettings } from "@/lib/site-content";

export async function POST(req: Request) {
  return runAdminContentPost(req, async () => {
    const form = await req.formData();
    await saveBrandSettings({
      siteName: String(form.get("siteName") || "").trim(),
      logoMainUrl: String(form.get("logoMainUrl") || "").trim(),
      logoMarkUrl: String(form.get("logoMarkUrl") || "").trim(),
      faviconUrl: String(form.get("faviconUrl") || "").trim()
    });
  });
}
