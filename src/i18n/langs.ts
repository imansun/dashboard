// src\i18n\langs.ts
export const locales = {
  fa: {
    label: "فارسی",
    dayjs: () => import("dayjs/locale/fa"),
    flatpickr: null,
    i18n: () => import("./locales/fa/translations.json"),
    flag: "persian",
  },
  en: {
    label: "انگلیسی",
    dayjs: () => import("dayjs/locale/en"),
    flatpickr: null,
    i18n: () => import("./locales/en/translations.json"),
    flag: "united-kingdom",
  },
  ar: {
    label: "عربی",
    dayjs: () => import("dayjs/locale/ar"),
    flatpickr: () =>
      import("flatpickr/dist/l10n/ar").then((module) => module.Arabic),
    i18n: () => import("./locales/ar/translations.json"),
    flag: "saudi",
  },
};

export const supportedLanguages = Object.keys(locales);

export type LocaleCode = keyof typeof locales;

export type Dir = "ltr" | "rtl";
