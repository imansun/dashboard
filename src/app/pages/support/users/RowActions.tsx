// src\app\pages\support\users\RowActions.tsx
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import {
  EllipsisHorizontalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Row, Table } from "@tanstack/react-table";

import { Button } from "@/components/ui";
import { PencilIcon } from "@heroicons/react/20/solid";

export function RowActions({
  row,
  table,
}: {
  row: Row<any>;
  table: Table<any>;
}) {
  return (
    <div className="flex justify-center">
      <Menu as="div" className="relative inline-block text-left">
        <MenuButton
          as={Button}
          variant="flat"
          isIcon
          className="size-7 rounded-full"
        >
          <EllipsisHorizontalIcon className="size-4.5" />
        </MenuButton>

        <Transition
          as={MenuItems}
          anchor={{ to: "bottom end" }}
          enter="transition ease-out"
          enterFrom="opacity-0 translate-y-2"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-2"
          className="dark:border-dark-500 dark:bg-dark-750 absolute z-100 min-w-[10rem] rounded-lg border border-gray-300 bg-white py-1 shadow-lg shadow-gray-200/50 outline-hidden focus-visible:outline-hidden dark:shadow-none"
        >
          <MenuItem>
            {({ focus, close }) => (
              <button
                className={clsx(
                  "flex h-9 w-full items-center space-x-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus &&
                    "dark:bg-dark-600 dark:text-dark-100 bg-gray-100 text-gray-800",
                )}
                onClick={() => {
                  close();
                  table.options.meta?.openEdit?.(row.original);
                }}
              >
                <PencilIcon className="size-4.5 stroke-1" />
                <span>ویرایش</span>
              </button>
            )}
          </MenuItem>

          <MenuItem>
            {({ focus, close }) => (
              <button
                className={clsx(
                  "this:error text-this dark:text-this-light flex h-9 w-full items-center space-x-3 px-3 tracking-wide outline-hidden transition-colors",
                  focus && "bg-this/10 dark:bg-this-light/10",
                )}
                onClick={() => {
                  close();
                  table.options.meta?.openDelete?.(row.original);
                }}
              >
                <TrashIcon className="size-4.5 stroke-1" />
                <span>حذف</span>
              </button>
            )}
          </MenuItem>
        </Transition>
      </Menu>
    </div>
  );
}
