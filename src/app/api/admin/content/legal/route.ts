import { runAdminContentPost } from "@/lib/admin/content-route";
import { saveLegalPages } from "@/lib/site-content";

export async function POST(req: Request) {
  return runAdminContentPost(req, async () => {
    const form = await req.formData();
    await saveLegalPages({
      privacyText: String(form.get("privacyText") ?? ""),
      termsText: String(form.get("termsText") ?? ""),
      aboutText: String(form.get("aboutText") ?? "")
    });
  });
}
