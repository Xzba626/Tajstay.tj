import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type HomeBanner = {
  enabled: boolean;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
};

export type BrandSettings = {
  siteName: string;
  logoMainUrl: string;
  logoMarkUrl: string;
  faviconUrl: string;
};

export type PaymentCatalog = {
  methods: string[];
};

export type SupportContacts = {
  supportTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  instagram: string;
  workingHours: string;
};

export type LegalPages = {
  privacyText: string;
  termsText: string;
};

type SiteContent = {
  homeBanner: HomeBanner;
  brand: BrandSettings;
  paymentCatalog: PaymentCatalog;
  support: SupportContacts;
  legal: LegalPages;
};

const SITE_CONTENT_ID = 1;
const LEGACY_FILE = path.join(process.cwd(), "data", "site-content.json");

const defaultContent: SiteContent = {
  homeBanner: {
    enabled: true,
    title: "TajStay Premium",
    subtitle: "Спецпредложения и лучшие объекты недели по Таджикистану.",
    ctaText: "Смотреть предложения",
    ctaHref: "/search"
  },
  brand: {
    siteName: "TajStay",
    logoMainUrl: "/logo-main.png",
    logoMarkUrl: "/logo-mark.svg",
    faviconUrl: "/logo-mark.svg"
  },
  paymentCatalog: {
    methods: ["Visa", "Mastercard", "Humo", "Dushanbe City Wallet", "Alif Mobi"]
  },
  support: {
    supportTitle: "TajStay Support",
    email: "support@tajstay.example",
    phone: "+992 (__) ___-__-__",
    whatsapp: "",
    telegram: "",
    instagram: "",
    workingHours: "Ежедневно 09:00–21:00"
  },
  legal: {
    privacyText: "Политика конфиденциальности будет добавлена администратором.",
    termsText: "Пользовательское соглашение будет добавлено администратором."
  }
};

function mergeWithDefaults(parsed: Partial<SiteContent> | null | undefined): SiteContent {
  return {
    homeBanner: {
      ...defaultContent.homeBanner,
      ...parsed?.homeBanner
    },
    brand: {
      ...defaultContent.brand,
      ...parsed?.brand
    },
    paymentCatalog: {
      methods: Array.isArray(parsed?.paymentCatalog?.methods)
        ? parsed.paymentCatalog.methods.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        : defaultContent.paymentCatalog.methods
    },
    support: {
      ...defaultContent.support,
      ...(parsed?.support ?? {})
    },
    legal: {
      ...defaultContent.legal,
      ...(parsed?.legal ?? {})
    }
  };
}

async function readLegacyFile(): Promise<SiteContent | null> {
  try {
    const raw = await readFile(LEGACY_FILE, "utf8");
    return mergeWithDefaults(JSON.parse(raw) as Partial<SiteContent>);
  } catch {
    return null;
  }
}

async function persist(content: SiteContent): Promise<void> {
  await prisma.siteContentState.upsert({
    where: { id: SITE_CONTENT_ID },
    create: { id: SITE_CONTENT_ID, content: content as unknown as Prisma.InputJsonValue },
    update: { content: content as unknown as Prisma.InputJsonValue }
  });
}

async function ensureSiteContentRow(): Promise<SiteContent> {
  const row = await prisma.siteContentState.findUnique({ where: { id: SITE_CONTENT_ID } });
  if (row?.content) {
    return mergeWithDefaults(row.content as Partial<SiteContent>);
  }

  const legacy = await readLegacyFile();
  const initial = legacy ?? defaultContent;
  await persist(initial);
  return initial;
}

export async function getSiteContent(): Promise<SiteContent> {
  try {
    return await ensureSiteContentRow();
  } catch {
    const legacy = await readLegacyFile();
    return legacy ?? defaultContent;
  }
}

async function updateSection(patch: Partial<SiteContent>): Promise<void> {
  const current = await getSiteContent();
  const next = mergeWithDefaults({ ...current, ...patch });
  await persist(next);
}

export async function saveHomeBanner(input: HomeBanner): Promise<void> {
  await updateSection({
    homeBanner: {
      enabled: input.enabled,
      title: input.title.trim(),
      subtitle: input.subtitle.trim(),
      ctaText: input.ctaText.trim(),
      ctaHref: input.ctaHref.trim() || "/search"
    }
  });
}

export async function saveBrandSettings(input: BrandSettings): Promise<void> {
  await updateSection({
    brand: {
      siteName: input.siteName.trim() || defaultContent.brand.siteName,
      logoMainUrl: input.logoMainUrl.trim() || defaultContent.brand.logoMainUrl,
      logoMarkUrl: input.logoMarkUrl.trim() || defaultContent.brand.logoMarkUrl,
      faviconUrl: input.faviconUrl.trim() || defaultContent.brand.faviconUrl
    }
  });
}

export async function savePaymentCatalog(input: PaymentCatalog): Promise<void> {
  await updateSection({
    paymentCatalog: {
      methods: input.methods.map((m) => m.trim()).filter(Boolean)
    }
  });
}

export async function saveSupportContacts(input: SupportContacts): Promise<void> {
  await updateSection({
    support: {
      supportTitle: input.supportTitle.trim() || defaultContent.support.supportTitle,
      email: input.email.trim(),
      phone: input.phone.trim(),
      whatsapp: input.whatsapp.trim(),
      telegram: input.telegram.trim(),
      instagram: input.instagram.trim(),
      workingHours: input.workingHours.trim()
    }
  });
}

export async function saveLegalPages(input: LegalPages): Promise<void> {
  await updateSection({
    legal: {
      privacyText: input.privacyText.trim() || defaultContent.legal.privacyText,
      termsText: input.termsText.trim() || defaultContent.legal.termsText
    }
  });
}
