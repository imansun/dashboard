// src\components\shared\form\Datepicker\jalali-plugin.ts
// // jalali-plugin.ts
// import moment from "jalali-moment";

// export function jalaliPlugin(): Plugin {
//   return function (fp: any) {
//     return {
//       onValueUpdate: [
//         (selectedDates: Date[]) => {
//           if (selectedDates.length) {
//             const jalaliDate = moment(selectedDates[0]).format("jYYYY/jMM/jDD");
//             if (fp.input) fp.input.value = jalaliDate;
//           }
//         },
//       ],
//       onChange: [
//         (selectedDates: Date[], ) => {
//           if (selectedDates.length) {
//             const jalaliDate = moment(selectedDates[0]).format("jYYYY/jMM/jDD");
//             if (fp.input) fp.input.value = jalaliDate;
//           }
//         },
//       ],
//     };
//   };
// }
