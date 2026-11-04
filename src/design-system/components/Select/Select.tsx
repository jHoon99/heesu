"use client";

import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "../../cn";

const select = cva(
  "w-full appearance-none rounded-md border bg-bg-surface-raised pr-10 pl-3 text-text transition-colors duration-(--dur-fast) ease-out disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-text-subtle",
  {
    variants: {
      size: { md: "h-10 text-body-sm", lg: "h-12 text-base" },
      invalid: { true: "border-danger-500", false: "border-border-strong" },
    },
  },
);

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  size?: "md" | "lg";
  placeholder?: string;
  options: (string | { value: string; label: string })[];
}

export function Select({
  label,
  hint,
  error,
  size = "lg",
  placeholder,
  options,
  required,
  id,
  className,
  value,
  defaultValue,
  "aria-describedby": describedByProp,
  "aria-invalid": ariaInvalidProp,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const messageId = `${selectId}-msg`;
  const hasMessage = Boolean(error) || Boolean(hint);
  // With a placeholder and no value, start on the empty placeholder option.
  const valueProps =
    value !== undefined
      ? { value }
      : { defaultValue: defaultValue ?? (placeholder ? "" : undefined) };

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-label text-text">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-danger-700">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={error ? true : ariaInvalidProp}
          aria-describedby={
            [describedByProp, hasMessage ? messageId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(select({ size, invalid: Boolean(error) }), className)}
          {...valueProps}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-muted"
        />
      </div>
      {error ? (
        <p id={messageId} className="text-caption text-danger-700">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-caption text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
