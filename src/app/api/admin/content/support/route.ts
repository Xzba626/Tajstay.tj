import { runAdminContentPost } from "@/lib/admin/content-route";
import { saveSupportContacts } from "@/lib/site-content";

export async function POST(req: Request) {
  return runAdminContentPost(req, async () => {
    const form = await req.formData();
    await saveSupportContacts({
      supportTitle: String(form.get("supportTitle") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      whatsapp: String(form.get("whatsapp") ?? ""),
      telegram: String(form.get("telegram") ?? ""),
      instagram: String(form.get("instagram") ?? ""),
      workingHours: String(form.get("workingHours") ?? "")
    });
  });
}
