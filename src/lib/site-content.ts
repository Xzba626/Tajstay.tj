import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "site-content.json");

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

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteContent>;
    return {
      homeBanner: {
        ...defaultContent.homeBanner,
        ...parsed.homeBanner
      },
      brand: {
        ...defaultContent.brand,
        ...parsed.brand
      },
      paymentCatalog: {
        methods: Array.isArray(parsed.paymentCatalog?.methods)
          ? parsed.paymentCatalog?.methods.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          : defaultContent.paymentCatalog.methods
      },
      support: {
        ...defaultContent.support,
        ...(parsed.support ?? {})
      },
      legal: {
        ...defaultContent.legal,
        ...(parsed.legal ?? {})
      }
    };
  } catch {
    return defaultContent;
  }
}

export async function saveHomeBanner(input: HomeBanner): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const current = await getSiteContent();
  const next: SiteContent = {
    ...current,
    homeBanner: {
      enabled: input.enabled,
      title: input.title.trim(),
      subtitle: input.subtitle.trim(),
      ctaText: input.ctaText.trim(),
      ctaHref: input.ctaHref.trim() || "/search"
    }
  };
  await writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
}

export async function saveBrandSettings(input: BrandSettings): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const current = await getSiteContent();
  const next: SiteContent = {
    ...current,
    brand: {
      siteName: input.siteName.trim() || defaultContent.brand.siteName,
      logoMainUrl: input.logoMainUrl.trim() || defaultContent.brand.logoMainUrl,
      logoMarkUrl: input.logoMarkUrl.trim() || defaultContent.brand.logoMarkUrl,
      faviconUrl: input.faviconUrl.trim() || defaultContent.brand.faviconUrl
    }
  };
  await writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
}

export async function savePaymentCatalog(input: PaymentCatalog): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const current = await getSiteContent();
  const next: SiteContent = {
    ...current,
    paymentCatalog: {
      methods: input.methods.map((m) => m.trim()).filter(Boolean)
    }
  };
  await writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
}

export async function saveSupportContacts(input: SupportContacts): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const current = await getSiteContent();
  const next: SiteContent = {
    ...current,
    support: {
      supportTitle: input.supportTitle.trim() || defaultContent.support.supportTitle,
      email: input.email.trim(),
      phone: input.phone.trim(),
      whatsapp: input.whatsapp.trim(),
      telegram: input.telegram.trim(),
      instagram: input.instagram.trim(),
      workingHours: input.workingHours.trim()
    }
  };
  await writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
}

export async function saveLegalPages(input: LegalPages): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const current = await getSiteContent();
  const next: SiteContent = {
    ...current,
    legal: {
      privacyText: input.privacyText.trim() || defaultContent.legal.privacyText,
      termsText: input.termsText.trim() || defaultContent.legal.termsText
    }
  };
  await writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
}
