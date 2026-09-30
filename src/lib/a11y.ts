import type { KeyboardEvent } from "react";

/**
 * Props that make a non-button container (e.g. a row holding nested buttons)
 * keyboard- and screen-reader-operable. Enter/Space only fire when the row
 * itself is focused, so nested controls keep working.
 */
export function rowButtonProps(onActivate: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
