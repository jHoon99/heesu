import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "../../cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-label whitespace-nowrap transition-colors duration-(--dur-fast) ease-out disabled:cursor-not-allowed disabled:border-transparent disabled:bg-gray-100 disabled:text-text-subtle",
  {
    variants: {
      variant: {
        primary: "bg-primary text-text-on-brand hover:bg-primary-hover",
        secondary:
          "border border-primary bg-transparent text-text-brand hover:bg-primary-soft",
        ghost: "bg-transparent text-text-muted hover:bg-bg-subtle",
        danger: "bg-danger-700 text-text-on-brand hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-5",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "lg", block: false },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export function Button({
  variant = "primary",
  size = "lg",
  block = false,
  icon: Icon,
  iconRight: IconRight,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(button({ variant, size, block }), className)}
      {...rest}
    >
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
      {IconRight ? <IconRight size={16} aria-hidden="true" /> : null}
    </button>
  );
}
