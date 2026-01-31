// src/app/pages/support/users/filters/DateRangeColumnFilter.tsx
import { useMemo } from "react";
import { DatePicker } from "@/components/shared/form/Datepicker/Datepicker";

type DateRangeFilter = {
  from?: string; // ISO
  to?: string; // ISO
};

const toIsoStart = (d: Date) => {
  const x = new Date(d);
  // ✅ شروع روز (UTC) برای فیلتر از
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
};

const toIsoEnd = (d: Date) => {
  const x = new Date(d);
  // ✅ انتهای روز (UTC) برای فیلتر تا
  x.setUTCHours(23, 59, 59, 999);
  return x.toISOString();
};

export function DateRangeColumnFilter({ column }: { column: any }) {
  // ✅ مقدار فعلی فیلتر ستون (اگر وجود داشته باشد)
  const v = (column.getFilterValue() ?? {}) as DateRangeFilter;

  /**
   * ✅ اگر قبلاً فیلتر داشتیم، همان بازه را داخل DatePicker نمایش بده.
   * Flatpickr در حالت range، defaultDate را به شکل آرایه می‌خواهد.
   */
  const defaultDate = useMemo(() => {
    const from = v?.from ? new Date(v.from) : null;
    const to = v?.to ? new Date(v.to) : null;

    // رنج کامل
    if (from && to) return [from, to];
    // فقط شروع انتخاب شده
    if (from) return [from];

    return undefined;
  }, [v?.from, v?.to]);

  return (
    // ✅ دقیقا مثل نمونه: max-w-xl (نه حالت سرچ، نه استایل‌های دیگر)
    <div className="max-w-xl">
      <DatePicker
        options={{
          mode: "range",

          // ✅ فرمت میلادی استاندارد (Flatpickr)
          dateFormat: "Y-m-d",

          // ✅ مقدار اولیه بازه (اگر قبلاً فیلتر ست شده)
          defaultDate,
        }}
        placeholder={column.columnDef?.meta?.placeholder ?? "انتخاب بازه تاریخ..."}
        // ✅ مثل نمونه: تمام عرض
        className="w-full"
        onChange={(selectedDates: Date[]) => {
          // ✅ پاک شد => فیلتر حذف => نمایش همه
          if (!selectedDates || selectedDates.length === 0) {
            column.setFilterValue(undefined);
            return;
          }

          const [start, end] = selectedDates;

          // ✅ فقط شروع انتخاب شده
          if (start && !end) {
            column.setFilterValue({ from: toIsoStart(start) });
            return;
          }

          // ✅ رنج کامل
          if (start && end) {
            column.setFilterValue({
              from: toIsoStart(start),
              to: toIsoEnd(end),
            });
            return;
          }

          // ✅ حالت‌های غیرمنتظره
          column.setFilterValue(undefined);
        }}
      />
    </div>
  );
}
