import { Persian, English } from "flatpickr/dist/l10n/fa";  // وارد کردن فارسی و انگلیسی
import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo, InputHTMLAttributes, HTMLAttributes } from "react";
import flatpickr from "flatpickr";
import moment from "jalali-moment";
import type { Instance } from "flatpickr/dist/types/instance";
import { FlatpickrProps, FlatpickrRef, hooks, callbacks } from "./types";
import { formatAndSetValue } from "./utils";

const toJalaliDate = (date: Date) => {
  return moment(date).format("jYYYY/jMM/jDD");
};

const getRangeSeparator = (instance: Instance) => {
  return ((instance?.l10n as any)?.rangeSeparator as string) ?? " تا ";
};

const formatSelectedDates = (selectedDates: Date[], instance: Instance) => {
  const mode = (instance?.config as any)?.mode;

  if (mode === "range") {
    const sep = getRangeSeparator(instance);

    if (selectedDates.length === 0) return "";
    if (selectedDates.length === 1) return toJalaliDate(selectedDates[0]);

    return `${toJalaliDate(selectedDates[0])}${sep}${toJalaliDate(selectedDates[1])}`;
  }

  return selectedDates.length ? toJalaliDate(selectedDates[0]) : "";
};

const Flatpickr = forwardRef<FlatpickrRef, FlatpickrProps>((props, ref) => {
  const {
    options = {},
    defaultValue,
    value,
    children,
    render,
    onChange,
    onOpen,
    onClose,
    onMonthChange,
    onYearChange,
    onReady,
    onValueUpdate,
    onDayCreate,
    onCreate,
    onDestroy,
    wrap,
    ...restProps
  } = props;

  const elementRef = useRef<FlatpickrRef | null>(null);
  const fpRef = useRef<Instance | null>(null);

  // **تخصیص locale** به طور صحیح
  const locale = "fa";  // یا می‌توانید از context یا i18n استفاده کنید
  const fpLocale = locale === "fa" ? Persian : English;

  const flatpickrOptions = useMemo(() => {
    return {
      ...options,
      locale: fpLocale,  // ارسال locale به طور صحیح
      onChange: (selectedDates: Date[]) => {
        const inst = fpRef.current;
        if (!inst) return;

        const formattedDate = formatSelectedDates(selectedDates, inst);

        if (Array.isArray(onChange)) {
          onChange.forEach((callback) =>
            callback(selectedDates, formattedDate, inst)
          );
        } else if (onChange) {
          onChange(selectedDates, formattedDate, inst);
        }
      },
      onOpen,
      onClose,
      onMonthChange,
      onYearChange,
      onReady,
      onValueUpdate,
      onDayCreate,
    };
  }, [
    options,
    onChange,
    onOpen,
    onClose,
    onMonthChange,
    onYearChange,
    onReady,
    onValueUpdate,
    onDayCreate,
  ]);

  const initFlatpickr = useCallback(() => {
    if (!elementRef.current) return;

    try {
      const instance = flatpickr(
        elementRef.current,
        flatpickrOptions
      ) as Instance;
      fpRef.current = instance;

      if (value !== undefined && value !== "") {
        formatAndSetValue(instance, value);
      } else if (defaultValue) {
        formatAndSetValue(instance, defaultValue);
      }
    } catch (error) {
      console.error("Error initializing flatpickr:", error);
    }
  }, [flatpickrOptions, value, defaultValue]);

  const destroyFlatpickr = useCallback(() => {
    if (fpRef.current) {
      if (onDestroy) {
        onDestroy(fpRef.current);
      }
      fpRef.current.destroy();
      fpRef.current = null;
    }
  }, [onDestroy]);

  const handleElementRef = useCallback(
    (element: FlatpickrRef | null) => {
      elementRef.current = element;

      if (element && !fpRef.current) {
        initFlatpickr();
      }
    },
    [initFlatpickr]
  );

  useEffect(() => {
    if (elementRef.current && !fpRef.current) {
      initFlatpickr();
    }

    return () => {
      destroyFlatpickr();
    };
  }, [destroyFlatpickr, initFlatpickr]);

  useEffect(() => {
    if (fpRef.current && value !== undefined) {
      formatAndSetValue(fpRef.current, value);
    }
  }, [value]);

  useEffect(() => {
    if (wrap) {
      destroyFlatpickr();
      initFlatpickr();
    }
  }, [children, wrap, destroyFlatpickr, initFlatpickr]);

  const filteredProps = useMemo(() => {
    const filtered = { ...restProps };
    hooks.forEach((hook) => {
      delete (filtered as any)[hook];
    });
    callbacks.forEach((callback) => {
      delete (filtered as any)[callback];
    });
    return filtered;
  }, [restProps]);

  const getFormattedValue = useCallback(() => {
    if (value === undefined || value === "") {
      if (typeof defaultValue === "string") {
        const date = new Date(defaultValue);
        if (!isNaN(date.getTime())) {
          return toJalaliDate(date);
        }
      } else if (defaultValue instanceof Date) {
        return toJalaliDate(defaultValue);
      }
      return defaultValue || "";
    }

    if (fpRef.current) {
      return formatSelectedDates(fpRef.current.selectedDates, fpRef.current);
    }

    return value;
  }, [value, defaultValue]);

  const renderedValue = useMemo(() => getFormattedValue(), [getFormattedValue]);

  if (render) {
    return render({ ...filteredProps, value: renderedValue }, elementRef);
  }

  return wrap ? (
    <div
      {...(filteredProps as HTMLAttributes<HTMLDivElement>)}
      ref={handleElementRef}
    >
      {children}
    </div>
  ) : (
    <input
      {...(filteredProps as InputHTMLAttributes<HTMLInputElement>)}
      value={String(renderedValue)}
      ref={handleElementRef}
    />
  );
});

Flatpickr.displayName = "Flatpickr";

export { Flatpickr };
