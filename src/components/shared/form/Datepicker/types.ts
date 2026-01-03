// src\components\shared\form\Datepicker\types.ts
export type Locale = {
  weekdays: {
    shorthand: [string, string, string, string, string, string, string];
    longhand: [string, string, string, string, string, string, string];
  };
  months: {
    shorthand: [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string
    ];
    longhand: [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string
    ];
  };
  daysInMonth: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];
  firstDayOfWeek: number;
  ordinal: (nth: number) => string;
  rangeSeparator: string;
  weekAbbreviation: string;
  scrollTitle: string;
  toggleTitle: string;
  amPM: [string, string];
  yearAriaLabel: string;
  monthAriaLabel: string;
  hourAriaLabel: string;
  minuteAriaLabel: string;
  time_24hr: boolean;
};

export type CustomLocale = {
  ordinal?: Locale["ordinal"];
  daysInMonth?: Locale["daysInMonth"];
  firstDayOfWeek?: Locale["firstDayOfWeek"];
  rangeSeparator?: Locale["rangeSeparator"];
  weekAbbreviation?: Locale["weekAbbreviation"];
  toggleTitle?: Locale["toggleTitle"];
  scrollTitle?: Locale["scrollTitle"];
  yearAriaLabel?: string;
  monthAriaLabel?: string;
  hourAriaLabel?: string;
  minuteAriaLabel?: string;
  amPM?: Locale["amPM"];
  time_24hr?: Locale["time_24hr"];
  weekdays: {
    shorthand: [string, string, string, string, string, string, string];
    longhand: [string, string, string, string, string, string, string];
  };
  months: {
    shorthand: [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string
    ];
    longhand: [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string
    ];
  };
};

export type key =
  | "ar"
  | "at"
  | "az"
  | "be"
  | "bg"
  | "bn"
  | "bs"
  | "ca"
  | "cat"
  | "ckb"
  | "cs"
  | "cy"
  | "da"
  | "de"
  | "default"
  | "en"
  | "eo"
  | "es"
  | "et"
  | "fa"
  | "fi"
  | "fo"
  | "fr"
  | "gr"
  | "he"
  | "hi"
  | "hr"
  | "hu"
  | "hy"
  | "id"
  | "is"
  | "it"
  | "ja"
  | "ka"
  | "ko"
  | "km"
  | "kz"
  | "lt"
  | "lv"
  | "mk"
  | "mn"
  | "ms"
  | "my"
  | "nl"
  | "nn"
  | "no"
  | "pa"
  | "pl"
  | "pt"
  | "ro"
  | "ru"
  | "si"
  | "sk"
  | "sl"
  | "sq"
  | "sr"
  | "sv"
  | "th"
  | "tr"
  | "uk"
  | "vn"
  | "zh"
  | "uz"
  | "uz_latn"
  | "zh_tw";

export const Persian: CustomLocale = {
  weekdays: {
    shorthand: ["یک", "دو", "سه", "چهار", "پنج", "جمعه", "شنبه"],
    longhand: [
      "یک‌شنبه",
      "دوشنبه",
      "سه‌شنبه",
      "چهارشنبه",
      "پنچ‌شنبه",
      "جمعه",
      "شنبه",
    ],
  },

  months: {
    shorthand: [
      "فروردین",
      "اردیبهشت",
      "خرداد",
      "تیر",
      "مرداد",
      "شهریور",
      "مهر",
      "آبان",
      "آذر",
      "دی",
      "بهمن",
      "اسفند",
    ],
    longhand: [
      "فروردین",
      "اردیبهشت",
      "خرداد",
      "تیر",
      "مرداد",
      "شهریور",
      "مهر",
      "آبان",
      "آذر",
      "دی",
      "بهمن",
      "اسفند",
    ],
  },
  daysInMonth: [
    31, 31, 31, 31, 31, 31,
    30, 30, 30, 30, 30, 29, 
  ],
  firstDayOfWeek: 6,
  ordinal: () => "",
  rangeSeparator: " تا ",
  weekAbbreviation: "هف",
  scrollTitle: "برای تغییر سال اسکرول کنید",
  toggleTitle: "برای تغییر ساعت کلیک کنید",
  amPM: ["ق.ظ", "ب.ظ"],
  yearAriaLabel: "سال",
  monthAriaLabel: "ماه",
  hourAriaLabel: "ساعت",
  minuteAriaLabel: "دقیقه",
  time_24hr: true,
};