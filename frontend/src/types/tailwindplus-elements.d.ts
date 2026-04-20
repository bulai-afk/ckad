import type * as React from "react";

/** Кастомные элементы @tailwindplus/elements + атрибуты Popover / Invoker. */
declare module "react" {
  interface HTMLAttributes<T> {
    command?: string;
    commandfor?: string;
    popoverTarget?: string;
    anchor?: string;
    popover?: string;
  }

  namespace JSX {
    interface IntrinsicElements {
      "el-popover-group": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      "el-popover": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      "el-dialog": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      "el-dialog-panel": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      "el-disclosure": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export {};
