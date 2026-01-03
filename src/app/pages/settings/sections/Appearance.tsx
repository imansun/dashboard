// src\app\pages\settings\sections\Appearance.tsx
// Import Dependencies
import { Label, Radio, RadioGroup } from "@headlessui/react";
import clsx from "clsx";
import { toast } from "sonner";

// Local Imports
import { useThemeContext } from "@/app/contexts/theme/context";
import { colors } from "@/constants/colors";
import { Listbox } from "@/components/shared/form/StyledListbox";
import { useDidUpdate } from "@/hooks";
import { Button, Switch } from "@/components/ui";
import {
  PrimaryColor,
  LightColor,
  DarkColor,
  Notification,
} from "@/configs/@types/theme";

// ----------------------------------------------------------------------

const primaryColors: PrimaryColor[] = [
  "indigo",
  "blue",
  "green",
  "amber",
  "purple",
  "rose",
];
const lightColors: LightColor[] = ["slate", "gray", "neutral"];
const lightColorsLabels: Record<LightColor, string> = {
  slate: "سنگی",
  gray: "خاکستری",
  neutral: "خنثی",
};

const darkColors: DarkColor[] = ["mint", "navy", "mirage", "cinder", "black"];
const darkColorsLabels: Record<DarkColor, string> = {
  mint: "نعنایی",
  navy: "سرمه‌ای",
  mirage: "سراب",
  cinder: "خاکستر",
  black: "سیاه",
};


const cardSkins = [
  {
    value: "shadow",
    label: "سایه‌دار",
  },
  {
    value: "bordered",
    label: "قاب‌دار",
  },
];

const notificationPos: {
  value: Notification["position"];
  label: string;
}[] = [
  {
    value: "top-left",
    label: "بالا چپ",
  },
  {
    value: "top-center",
    label: "بالا وسط",
  },
  {
    value: "top-right",
    label: "بالا راست",
  },
  {
    value: "bottom-left",
    label: "پایین چپ",
  },
  {
    value: "bottom-center",
    label: "پایین وسط",
  },
  {
    value: "bottom-right",
    label: "پایین راست",
  },
];

const MAX_NOTIFICATION_COUNT = 5;

export default function Appearance() {
  const theme = useThemeContext();

  useDidUpdate(() => {
    const currentPosition = notificationPos.find(
      (pos) => pos.value === theme.notification?.position,
    );

    if (currentPosition) {
      toast("موقعیت بروزرسانی شد", {
        description: `موقعیت اعلان به ${currentPosition.label} بروزرسانی شد`,
        descriptionClassName: "text-gray-600 dark:text-dark-200 text-xs mt-0.5",
      });
    }
  }, [theme.notification?.position]);

  useDidUpdate(() => {
    for (let i = 0; i < 3; i++) toast("این یک نوتیفیکیشن است");
  }, [theme.notification?.isExpanded]);

  return (
    <div className="w-full max-w-3xl 2xl:max-w-5xl">
      <h5 className="dark:text-dark-50 text-lg font-medium text-gray-800">
        ظاهر
      </h5>
      <p className="dark:text-dark-200 mt-0.5 text-sm text-balance text-gray-500">
        نمای برنامه را شخصی‌سازی کنید. رنگ‌ها و حالت تم را انتخاب کنید تا چهره‌ی برنامه تغییر یابد.
      </p>
      <div className="dark:bg-dark-500 my-5 h-px bg-gray-200" />

      <div className="space-y-8">
        <div>
          <div>
            <p className="dark:text-dark-100 text-base font-medium text-gray-800">
              تم
            </p>
            <p className="mt-0.5">
              می‌توانید یک رنگ برای تم از لیست زیر انتخاب کنید.
            </p>
          </div>
          <RadioGroup
            value={theme.themeMode}
            onChange={theme.setThemeMode}
            className="mt-4"
          >
            <Label className="sr-only">حالت تم (تاریک یا روشن)</Label>
            <div className="mt-2 flex flex-wrap gap-6">
              <Radio
                value="system"
                className="w-44 cursor-pointer outline-hidden"
              >
                {({ checked }) => (
                  <>
                    <div
                      className={clsx(
                        "bg-dark-900 relative overflow-hidden rounded-lg border-2 dark:border-transparent",
                        checked &&
                          "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                      )}
                    >
                      <div
                        style={{
                          clipPath: "polygon(50% 50%, 100% 0, 0 0, 0% 100%)",
                        }}
                        className="w-full space-y-2 bg-gray-50 p-1.5"
                      >
                        <div className="w-full space-y-2 rounded-sm bg-white p-2 shadow-xs">
                          <div className="bg-gray-150 h-2 w-9/12 rounded-lg"></div>
                          <div className="bg-gray-150 h-2 w-11/12 rounded-lg"></div>
                        </div>
                        <div className="flex items-center space-x-2 rounded-sm bg-white p-2 shadow-xs">
                          <div className="bg-gray-150 size-4 shrink-0 rounded-full"></div>
                          <div className="bg-gray-150 h-2 w-full rounded-lg"></div>
                        </div>
                        <div className="flex items-center space-x-2 rounded-sm bg-white p-2 shadow-xs">
                          <div className="bg-gray-150 size-4 shrink-0 rounded-full"></div>
                          <div className="bg-gray-150 h-2 w-9/12 rounded-lg"></div>
                        </div>
                      </div>
                      <div
                        style={{
                          clipPath:
                            "polygon(50% 50%, 100% 0, 100% 100%, 0% 100%)",
                        }}
                        className="absolute inset-0 space-y-2 p-1.5"
                      >
                        <div className="bg-dark-700 w-full space-y-2 rounded-sm p-2 shadow-xs">
                          <div className="bg-dark-400 h-2 w-9/12 rounded-lg"></div>
                          <div className="bg-dark-400 h-2 w-11/12 rounded-lg"></div>
                        </div>
                        <div className="bg-dark-700 flex items-center space-x-2 rounded-sm p-2 shadow-xs">
                          <div className="bg-dark-400 size-4 shrink-0 rounded-full"></div>
                          <div className="bg-dark-400 h-2 w-full rounded-lg"></div>
                        </div>
                        <div className="bg-dark-700 flex items-center space-x-2 rounded-sm p-2 shadow-xs">
                          <div className="bg-dark-400 size-4 shrink-0 rounded-full"></div>
                          <div className="bg-dark-400 h-2 w-9/12 rounded-lg"></div>
                        </div>
                      </div>
                    </div>

                    <p className="mt-1.5 text-center">سیستم</p>
                  </>
                )}
              </Radio>
              <Radio
                value="light"
                className="w-44 cursor-pointer outline-hidden"
              >
                {({ checked }) => (
                  <>
                    <div
                      className={clsx(
                        "relative overflow-hidden rounded-lg border-2 dark:border-transparent",
                        checked &&
                          "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                      )}
                    >
                      <div className="w-full space-y-2 bg-gray-50 p-1.5">
                        <div className="w-full space-y-2 rounded-sm bg-white p-2 shadow-xs">
                          <div className="bg-gray-150 h-2 w-9/12 rounded-lg"></div>
                          <div className="bg-gray-150 h-2 w-11/12 rounded-lg"></div>
                        </div>
                        <div className="flex items-center space-x-2 rounded-sm bg-white p-2 shadow-xs">
                          <div className="bg-gray-150 size-4 shrink-0 rounded-full"></div>
                          <div className="bg-gray-150 h-2 w-full rounded-lg"></div>
                        </div>
                        <div className="flex items-center space-x-2 rounded-sm bg-white p-2 shadow-xs">
                          <div className="bg-gray-150 size-4 shrink-0 rounded-full"></div>
                          <div className="bg-gray-150 h-2 w-9/12 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-1.5 text-center">روشن</p>
                  </>
                )}
              </Radio>
              <Radio
                value="dark"
                className="w-44 cursor-pointer outline-hidden"
              >
                {({ checked }) => (
                  <>
                    <div
                      className={clsx(
                        "bg-dark-900 relative overflow-hidden rounded-lg border border-transparent",
                        checked &&
                          "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                      )}
                    >
                      <div className="bg-dark-900 w-full space-y-2 p-1.5">
                        <div className="bg-dark-700 w-full space-y-2 rounded-sm p-2 shadow-xs">
                          <div className="bg-dark-400 h-2 w-9/12 rounded-lg"></div>
                          <div className="bg-dark-400 h-2 w-11/12 rounded-lg"></div>
                        </div>
                        <div className="bg-dark-700 flex items-center space-x-2 rounded-sm p-2 shadow-xs">
                          <div className="bg-dark-400 size-4 shrink-0 rounded-full"></div>
                          <div className="bg-dark-400 h-2 w-full rounded-lg"></div>
                        </div>
                        <div className="bg-dark-700 flex items-center space-x-2 rounded-sm p-2 shadow-xs">
                          <div className="bg-dark-400 size-4 shrink-0 rounded-full"></div>
                          <div className="bg-dark-400 h-2 w-9/12 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-1.5 text-center">تاریک</p>
                  </>
                )}
              </Radio>
            </div>
          </RadioGroup>
        </div>
        <div>
          <div>
            <p className="dark:text-dark-100 text-base font-medium text-gray-800">
              رنگ اصلی
            </p>
            <p className="mt-0.5">
              رنگی را انتخاب کنید که به عنوان رنگ اصلی تم شما استفاده می‌شود.
            </p>
          </div>
          <RadioGroup
            value={theme.primaryColorScheme.name}
            onChange={theme.setPrimaryColorScheme}
            className="mt-2"
          >
            <Label className="sr-only">انتخاب رنگ اصلی تم</Label>
            <div className="mt-2 flex w-fit flex-wrap gap-4 sm:gap-5">
              {primaryColors.map((color) => (
                <Radio
                  key={color}
                  value={color}
                  className={({ checked }) =>
                    clsx(
                      "flex h-14 w-16 cursor-pointer items-center justify-center rounded-lg border outline-hidden",
                      checked
                        ? "border-primary-500"
                        : "dark:border-dark-500 border-gray-200",
                    )
                  }
                >
                  {({ checked }) => (
                    <div
                      className={clsx(
                        "mask is-diamond size-6 transition-all",
                        checked && "scale-110 rotate-45",
                      )}
                      style={{
                        backgroundColor: colors[color][500],
                      }}
                    ></div>
                  )}
                </Radio>
              ))}
            </div>
          </RadioGroup>
        </div>
        <div>
          <div>
            <p className="dark:text-dark-100 text-base font-medium text-gray-800">
              طرح رنگ روشن
            </p>
            <p className="mt-0.5">
              طرح رنگ روشن که برای تم شما استفاده خواهد شد را انتخاب کنید.
            </p>
          </div>
          <RadioGroup
            value={theme.lightColorScheme.name}
            onChange={theme.setLightColorScheme}
            className="mt-4"
          >
            <Label className="sr-only">طرح رنگ حالت روشن تم</Label>
            <div className="mt-2 flex flex-wrap gap-4">
              {lightColors.map((color) => (
                <Radio
                  key={color}
                  value={color}
                  className="w-32 cursor-pointer outline-hidden"
                >
                  {({ checked }) => (
                    <>
                      <div
                        className={clsx(
                          "relative overflow-hidden rounded-lg border-2 dark:border-transparent",
                          checked &&
                            "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                        )}
                      >
                        <div
                          className="w-full space-y-2 p-1.5"
                          style={{ backgroundColor: colors[color][200] }}
                        >
                          <div className="w-full space-y-2 rounded-sm bg-white p-2 shadow-xs">
                            <div
                              className="h-2 w-9/12 rounded-lg"
                              style={{ backgroundColor: colors[color][400] }}
                            ></div>
                            <div
                              className="h-2 w-11/12 rounded-lg"
                              style={{ backgroundColor: colors[color][400] }}
                            ></div>
                          </div>
                          <div className="flex items-center space-x-2 rounded-sm bg-white p-2 shadow-xs">
                            <div
                              className="size-4 shrink-0 rounded-full"
                              style={{ backgroundColor: colors[color][400] }}
                            ></div>
                            <div
                              className="h-2 w-full rounded-lg"
                              style={{ backgroundColor: colors[color][400] }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <p className="mt-1.5 text-center capitalize">{lightColorsLabels[color]}</p>
                    </>
                  )}
                </Radio>
              ))}
            </div>
          </RadioGroup>
        </div>
        <div>
          <div>
            <p className="dark:text-dark-100 text-base font-medium text-gray-800">
              طرح رنگ تیره
            </p>
            <p className="mt-0.5">
              طرح رنگ تیره که برای تم شما استفاده خواهد شد را انتخاب کنید.
            </p>
          </div>
          <RadioGroup
            value={theme.darkColorScheme.name}
            onChange={theme.setDarkColorScheme}
            className="mt-4"
          >
            <Label className="sr-only">طرح رنگ حالت تیره</Label>
            <div className="mt-2 flex flex-wrap gap-4">
              {darkColors.map((color) => (
                <Radio
                  key={color}
                  value={color}
                  className="w-32 cursor-pointer outline-hidden"
                >
                  {({ checked }) => (
                    <>
                      <div
                        className={clsx(
                          "relative overflow-hidden rounded-lg",
                          checked &&
                            "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                        )}
                      >
                        <div
                          className="w-full space-y-2 p-1.5"
                          style={{ backgroundColor: colors[color][900] }}
                        >
                          <div
                            className="w-full space-y-2 rounded-sm p-2 shadow-xs"
                            style={{ backgroundColor: colors[color][700] }}
                          >
                            <div
                              className="h-2 w-9/12 rounded-lg"
                              style={{ backgroundColor: colors[color][400] }}
                            ></div>
                            <div
                              className="h-2 w-11/12 rounded-lg"
                              style={{ backgroundColor: colors[color][400] }}
                            ></div>
                          </div>
                          <div
                            className="flex items-center space-x-2 rounded-sm p-2 shadow-xs"
                            style={{ backgroundColor: colors[color][700] }}
                          >
                            <div
                              className="size-4 shrink-0 rounded-full"
                              style={{ backgroundColor: colors[color][400] }}
                            ></div>
                            <div
                              className="h-2 w-full rounded-lg"
                              style={{ backgroundColor: colors[color][400] }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <p className="mt-1.5 text-center capitalize">{darkColorsLabels[color]}</p>
                    </>
                  )}
                </Radio>
              ))}
            </div>
          </RadioGroup>
        </div>
      </div>
      <div className="dark:bg-dark-500 my-6 h-px bg-gray-200"></div>
      <div>
        <div>
          <p className="dark:text-dark-100 text-base font-medium text-gray-800">
            اعلان
          </p>
          <p className="mt-0.5">
            موقعیت و شیوه نمایش اعلان‌ها را برای برنامه خود انتخاب کنید
          </p>
        </div>
        <div className="mt-3">
          <p>نوع نمایش گروه اعلان</p>
          <RadioGroup
            value={theme.notification?.isExpanded ? "expand" : "stack"}
            onChange={(val) => theme.setNotificationExpand(val === "expand")}
            className="mt-3 text-center"
          >
            <Label className="sr-only">نوع نمایش گروه اعلان</Label>
            <div className="grid max-w-xl gap-4 sm:grid-cols-2">
              <Radio value="stack" className="cursor-pointer outline-hidden">
                {({ checked }) => (
                  <>
                    <div
                      className={clsx(
                        "dark:border-dark-500 relative flex h-52 w-full items-center rounded-lg border border-gray-200 px-3 py-4",
                        checked &&
                          "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                      )}
                    >
                      <div className="w-full -space-y-6">
                        <div
                          className="dark:border-dark-500 dark:bg-dark-600 relative flex h-12 w-full flex-col justify-center space-y-2 rounded-sm border bg-white p-2 shadow-[0_4px_12px_#0000001a] dark:shadow-none"
                          style={{ transform: "scale(.9)" }}
                        >
                          <div className="bg-gray-150 dark:bg-dark-400 h-2 w-11/12 rounded-lg"></div>
                          <div className="bg-gray-150 dark:bg-dark-400 h-2 w-9/12 rounded-lg"></div>
                        </div>
                        <div
                          className="dark:border-dark-500 dark:bg-dark-600 relative flex h-12 w-full flex-col justify-center space-y-2 rounded-sm border bg-white p-2 shadow-[0_4px_12px_#0000001a] dark:shadow-none"
                          style={{ transform: "scale(.95)" }}
                        >
                          <div className="bg-gray-150 dark:bg-dark-400 h-2 w-11/12 rounded-lg"></div>
                          <div className="bg-gray-150 dark:bg-dark-400 h-2 w-9/12 rounded-lg"></div>
                        </div>
                        <div className="dark:border-dark-500 dark:bg-dark-600 relative flex h-12 w-full flex-col justify-center space-y-2 rounded-sm border bg-white پ-2 shadow-[0_4px_12px_#0000001a] dark:shadow-none">
                          <div className="bg-gray-150 dark:bg-dark-400 h-2 w-11/12 rounded-lg"></div>
                          <div className="bg-gray-150 dark:bg-dark-400 h-2 w-9/12 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2">تراکمی</p>
                  </>
                )}
              </Radio>
              <Radio value="expand" className="cursor-pointer outline-hidden">
                {({ checked }) => (
                  <>
                    <div
                      className={clsx(
                        "dark:border-dark-500 relative flex h-52 w-full flex-col justify-between space-y-2 rounded-lg border border-gray-200 px-4 py-5",
                        checked &&
                          "ring-primary-600 dark:ring-primary-500 dark:ring-offset-dark-700 ring-2 ring-offset-2 ring-offset-white transition-all",
                      )}
                    >
                      {Array(3)
                        .fill(null)
                        .map((_, i) => (
                          <div
                            key={i}
                            className="dark:border-dark-500 dark:bg-dark-600 relative flex h-12 w-full flex-col justify-center space-y-2 rounded-sm border bg-white پ-2 shadow-[0_4px_12px_#0000001a] dark:shadow-none"
                          >
                            <div className="bg-gray-150 dark:bg-dark-400 h-2 w-9/12 rounded-lg"></div>
                            <div className="bg-gray-150 dark:bg-dark-400 h-2 w-11/12 rounded-lg"></div>
                          </div>
                        ))}
                    </div>
                    <p className="mt-2">گسترش‌یافته</p>
                  </>
                )}
              </Radio>
            </div>
          </RadioGroup>
        </div>
        <div className="mt-4">
          <p>حداکثر تعداد اعلان قابل نمایش</p>
          <RadioGroup
            value={theme.notification?.visibleToasts}
            onChange={(val) => theme.setNotificationMaxCount(val)}
            className="mt-3 text-center"
          >
            <Label className="sr-only">حداکثر تعداد اعلان</Label>
            <div className="flex w-full max-w-sm space-x-0.5">
              {Array(MAX_NOTIFICATION_COUNT)
                .fill(null)
                .map((_, i) => (
                  <Radio
                    value={i + 1}
                    key={i}
                    className={({ checked }) =>
                      clsx(
                        "flex-1 cursor-pointer border-2 border-transparent border-b-current pb-1 text-base font-medium outline-hidden",
                        checked
                          ? "text-primary-600 dark:text-primary-400"
                          : "dark:text-dark-300 text-gray-500",
                      )
                    }
                  >
                    {i + 1}
                  </Radio>
                ))}
            </div>
          </RadioGroup>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3">
          <p className="my-auto">موقعیت اعلان:</p>
          <Listbox
            classNames={{
              root: "mt-1.5 flex-1 md:col-span-2 md:mt-0",
            }}
            data={notificationPos}
            value={notificationPos.find(
              (pos) => pos.value === theme.notification?.position,
            )}
            onChange={({ value }) => theme.setNotificationPosition(value)}
          />
        </div>
      </div>
      <div className="dark:bg-dark-500 my-6 h-px bg-gray-200"></div>
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <p className="my-auto">پوسته کارت:</p>
          <Listbox
            classNames={{
              root: "mt-1.5 flex-1 md:col-span-2 md:mt-0",
            }}
            data={cardSkins}
            value={cardSkins.find((skin) => skin.value === theme.cardSkin)}
            onChange={({ value }) => theme.setCardSkin(value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3">
          <p className="my-auto">حالت کروم تم:</p>
          <div className="dark:border-dark-450 mt-1.5 flex flex-1 items-center justify-between space-x-2 rounded-lg border border-gray-300 px-3 py-2 md:col-span-2 md:mt-0">
            <p className="dark:text-dark-100 text-gray-800">حالت تکی‌رنگ (Monochrome)</p>
            <Switch
              checked={theme.isMonochrome}
              onChange={(e) => theme.setMonochromeMode(e.target.checked)}
            />
          </div>
        </div>
      </div>
      <div className="mt-10">
        <Button color="primary" onClick={theme.resetTheme}>
          بازنشانی تم
        </Button>
      </div>
    </div>
  );
}
