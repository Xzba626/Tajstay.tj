type BotLocale = "ru" | "tg" | "en";

export function botLocaleFromTelegram(languageCode?: string | null): BotLocale {
  const lc = (languageCode || "").toLowerCase();
  if (lc.startsWith("tg") || lc === "tj") return "tg";
  if (lc.startsWith("en")) return "en";
  return "ru";
}

const MESSAGES: Record<
  BotLocale,
  {
    startWelcome: string;
    sharePhoneButton: string;
    codeSent: (code: string) => string;
    confirmed: string;
    expired: string;
    invalid: string;
    wrongAccount: string;
    cooldown: string;
    phoneRequired: string;
    openSiteToSignIn: string;
    changeTelegramCode: (code: string) => string;
    changeTelegramOpenProfile: string;
  }
> = {
  ru: {
    startWelcome:
      "Вход в <b>TajStay</b>\n\nНажмите кнопку ниже и поделитесь номером телефона. Мы отправим код <b>в этом чате</b> (не SMS).",
    sharePhoneButton: "Отправить номер телефона",
    codeSent: (code) => `Ваш код для входа в TajStay: <code>${code}</code>\n\nВведите его на сайте.`,
    confirmed: "Вход подтверждён. Вернитесь на сайт TajStay.",
    expired: "Ссылка для входа истекла. Запросите новую на сайте.",
    invalid: "Ссылка для входа недействительна.",
    wrongAccount: "Эта ссылка привязана к другому аккаунту Telegram.",
    cooldown: "Подождите минуту перед повторной отправкой кода.",
    phoneRequired: "Пожалуйста, нажмите кнопку «Отправить номер телефона».",
    openSiteToSignIn:
      "Откройте <b>TajStay</b> и нажмите «Войти через Telegram».\n\n<a href=\"https://www.tajstay.site/auth/sign-in\">tajstay.site/auth/sign-in</a>",
    changeTelegramCode: (code) =>
      `Код для смены Telegram в TajStay: <code>${code}</code>\n\nВведите его в профиле на сайте (10 минут).`,
    changeTelegramOpenProfile:
      "Откройте профиль на <b>TajStay</b> → Аккаунт → Telegram → «Открыть Telegram»."
  },
  tg: {
    startWelcome:
      "Вуруд ба <b>TajStay</b>\n\nТугмаи зеринро пахш кунед ва рақами телефонро мубодила кунед. Рамзро <b>дар ҳамин чат</b> мефиристем (на SMS).",
    sharePhoneButton: "Фиристодани рақами телефон",
    codeSent: (code) => `Рамзи вуруд ба TajStay: <code>${code}</code>\n\nОнро дар сомона ворид кунед.`,
    confirmed: "Вуруд тасдиқ шуд. Ба сомонаи TajStay баргардед.",
    expired: "Истиноди вуруд анҷом ёфт. Аз сомона дубора дархост кунед.",
    invalid: "Истиноди вуруд нодуруст аст.",
    wrongAccount: "Ин истинод ба ҳисоби дигари Telegram вобаста аст.",
    cooldown: "Пеш аз фиристодани дубораи рамз 1 дақиқа интизор шавед.",
    phoneRequired: "Лутфан тугмаи «Фиристодани рақами телефон»-ро пахш кунед.",
    openSiteToSignIn:
      "<b>TajStay</b>-ро кушоед ва «Ворид шудан бо Telegram»-ро пахш кунед.\n\n<a href=\"https://www.tajstay.site/auth/sign-in\">tajstay.site/auth/sign-in</a>",
    changeTelegramCode: (code) =>
      `Рамзи тағйири Telegram дар TajStay: <code>${code}</code>\n\nДар профили сомона ворид кунед (10 дақиқа).`,
    changeTelegramOpenProfile:
      "Профили TajStay → Ҳисоб → Telegram → «Кушодани Telegram»."
  },
  en: {
    startWelcome:
      "Sign in to <b>TajStay</b>\n\nTap the button below and share your phone number. We will send the code <b>in this chat</b> (not SMS).",
    sharePhoneButton: "Share phone number",
    codeSent: (code) => `Your TajStay sign-in code: <code>${code}</code>\n\nEnter it on the website.`,
    confirmed: "Sign-in confirmed. Return to the TajStay website.",
    expired: "This sign-in link has expired. Request a new one on the website.",
    invalid: "This sign-in link is invalid.",
    wrongAccount: "This link is linked to a different Telegram account.",
    cooldown: "Please wait 60 seconds before requesting a new code.",
    phoneRequired: "Please tap “Share phone number”.",
    openSiteToSignIn:
      "Open <b>TajStay</b> and tap “Sign in with Telegram”.\n\n<a href=\"https://www.tajstay.site/auth/sign-in\">tajstay.site/auth/sign-in</a>",
    changeTelegramCode: (code) =>
      `Your TajStay Telegram change code: <code>${code}</code>\n\nEnter it in your profile on the website (10 minutes).`,
    changeTelegramOpenProfile:
      "Open <b>TajStay</b> profile → Account → Telegram → “Open Telegram”."
  }
};

export function telegramBotMessages(locale: BotLocale) {
  return MESSAGES[locale];
}
