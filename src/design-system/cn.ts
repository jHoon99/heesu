import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-serif",
            "heading-serif",
            "h1",
            "h2",
            "h3",
            "body-lg",
            "body",
            "body-sm",
            "label",
            "table",
            "caption",
            "number-xl",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
