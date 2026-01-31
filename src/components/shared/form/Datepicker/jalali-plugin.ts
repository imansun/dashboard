// // src/components/shared/form/Datepicker/jalali-plugin.ts
// import moment from "jalali-moment";

// /**
//  * ✅ Jalali display plugin for flatpickr
//  * - input value: شمسی (single و range)
//  * - days grid: عدد روزها شمسی
//  * - month/year label: عنوان بالا شمسی
//  *
//  * نکته: flatpickr همچنان Date میلادی نگه می‌داره؛ فقط UI شمسی میشه.
//  */
// export function jalaliPlugin(): any {
//   return function (fp: any) {
//     const RANGE_SEP =
//       (fp?.l10n?.rangeSeparator as string | undefined) ?? " تا ";

//     const toJalali = (d: Date) => moment(d).format("jYYYY/jMM/jDD");

//     const setInputValue = (selectedDates: Date[]) => {
//       if (!fp?.input) return;

//       const mode = fp?.config?.mode;

//       if (mode === "range") {
//         if (selectedDates.length === 0) fp.input.value = "";
//         else if (selectedDates.length === 1)
//           fp.input.value = toJalali(selectedDates[0]);
//         else
//           fp.input.value = `${toJalali(selectedDates[0])}${RANGE_SEP}${toJalali(
//             selectedDates[1],
//           )}`;
//         return;
//       }

//       fp.input.value = selectedDates.length ? toJalali(selectedDates[0]) : "";
//     };

//     const updateMonthLabel = () => {
//       const nav = fp?.monthNav as HTMLElement | undefined;
//       if (!nav) return;

//       const base = new Date(fp.currentYear, fp.currentMonth, 1);
//       const label = moment(base).format("jMMMM jYYYY");

//       let el = nav.querySelector?.(
//         '[data-jalali-month-label="1"]',
//       ) as HTMLElement | null;

//       if (!el) {
//         el = document.createElement("span");
//         el.setAttribute("data-jalali-month-label", "1");
//         el.style.fontWeight = "600";
//         el.style.whiteSpace = "nowrap";
//         el.style.marginInline = "8px";
//         nav.appendChild(el);
//       }

//       el.textContent = label;
//     };

//     const patchDays = () => {
//       const daysContainer = fp?.daysContainer as HTMLElement | undefined;
//       if (!daysContainer) return;

//       const dayEls = daysContainer.querySelectorAll?.(
//         ".flatpickr-day",
//       ) as NodeListOf<HTMLElement>;

//       dayEls.forEach((dayEl) => {
//         const d: Date | undefined = (dayEl as any).dateObj;
//         if (!d) return;
//         dayEl.textContent = moment(d).format("jD");
//       });
//     };

//     return {
//       onReady: [
//         (selectedDates: Date[]) => {
//           updateMonthLabel();
//           patchDays();
//           setInputValue(selectedDates);
//         },
//       ],
//       onOpen: [
//         (selectedDates: Date[]) => {
//           updateMonthLabel();
//           patchDays();
//           setInputValue(selectedDates);
//         },
//       ],
//       onMonthChange: [
//         () => {
//           updateMonthLabel();
//           patchDays();
//         },
//       ],
//       onYearChange: [
//         () => {
//           updateMonthLabel();
//           patchDays();
//         },
//       ],
//       onValueUpdate: [
//         (selectedDates: Date[]) => {
//           setInputValue(selectedDates);
//         },
//       ],
//       onChange: [
//         (selectedDates: Date[]) => {
//           setInputValue(selectedDates);
//         },
//       ],
//       onDayCreate: [
//         (_: any, __: any, ___: any, dayElem: HTMLElement) => {
//           const d: Date | undefined = (dayElem as any).dateObj;
//           if (!d) return;
//           dayElem.textContent = moment(d).format("jD");
//         },
//       ],
//     };
//   };
// }
