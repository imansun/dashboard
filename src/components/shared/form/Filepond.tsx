// src\components\shared\form\Filepond.tsx
// Import Dependencies
import {
  FilePond as BaseFilePond,
  registerPlugin,
  FilePondProps,
} from "react-filepond";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import { forwardRef } from "react";
import clsx from "clsx";

import filepondCSS from "filepond/dist/filepond.min.css?inline";
import filepondImagePreviewCSS from "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css?inline";

import {
  injectStyles,
  insertStylesToHead,
  makeStyleTag,
} from "@/utils/dom/injectStylesToHead";

// ----------------------------------------------------------------------

registerPlugin(FilePondPluginImagePreview);

const styles = `@layer vendor {
  ${filepondCSS} ${filepondImagePreviewCSS}
}`;

const sheet = makeStyleTag();

injectStyles(sheet, styles);
insertStylesToHead(sheet);

interface FilePondPropsExtended extends FilePondProps {
  className?: string;
  classNames?: {
    root?: string;
    filepond?: string;
  };
  bordered?: boolean;
  filled?: boolean;
  grid?: number;
  style?: React.CSSProperties;
}
const filePondOptions = {
  labelIdle: 'فایل‌های خود را بکشید و رها کنید یا <span class="filepond--label-action">انتخاب کنید</span>',
  labelInvalidField: 'فیلد دارای فایل نامعتبر است',
  labelFileWaitingForSize: 'در حال بررسی سایز',
  labelFileSizeNotAvailable: 'سایز فایل موجود نیست',
  labelFileLoading: 'در حال بارگذاری',
  labelFileLoadError: 'خطا در بارگذاری',
  labelFileProcessing: 'در حال آپلود',
  labelFileProcessingComplete: 'آپلود کامل شد',
  labelFileProcessingAborted: 'آپلود لغو شد',
  labelFileProcessingError: 'خطا در آپلود',
  labelTapToCancel: 'برای لغو کلیک کنید',
  labelTapToRetry: 'برای تلاش دوباره کلیک کنید',
  labelTapToUndo: 'برای بازگشت کلیک کنید',
  labelButtonRemoveItem: 'حذف',
  labelButtonAbortItemLoad: 'لغو',
  labelButtonRetryItemLoad: 'تلاش دوباره',
  labelButtonAbortItemProcessing: 'لغو',
  labelButtonUndoItemProcessing: 'بازگشت',
  labelButtonRetryItemProcessing: 'تلاش دوباره',
  labelButtonProcessItem: 'آپلود',
};
const FilePond = forwardRef<BaseFilePond, FilePondPropsExtended>(
  (
    {
      className,
      classNames,
      bordered = true,
      filled = false,
      grid = 1,
      style,
      ...rest
    },
    ref,
  ) => {
    return (
      <div
        className={clsx(
          className,
          classNames?.root,
          bordered && "fp-bordered",
          filled && "fp-filled",
          grid && grid > 1 && "fp-grid",
        )}
        style={{ "--fp-grid": grid, ...style } as React.CSSProperties}
      >
        <BaseFilePond  {...filePondOptions} className={classNames?.filepond} ref={ref} {...rest} />
      </div>
    );
  },
);

FilePond.displayName = "FilePond";

export { FilePond };
