"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../cn";

const field = cva(
  "w-full rounded-md border bg-bg-surface-raised px-3 text-text placeholder:text-text-subtle transition-colors duration-(--dur-fast) ease-out disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-text-subtle",
  {
    variants: {
      size: { md: "h-10 text-body-sm", lg: "h-12 text-base" },
      invalid: { true: "border-danger-500", false: "border-border-strong" },
    },
  },
);

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  size?: "md" | "lg";
  multiline?: boolean;
}

export function Input({
  label,
  hint,
  error,
  required,
  size = "lg",
  multiline = false,
  id,
  className,
  "aria-describedby": describedByProp,
  "aria-invalid": ariaInvalidProp,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-msg`;
  const hasMessage = Boolean(error) || Boolean(hint);
  const common = {
    id: inputId,
    required,
    "aria-invalid": error ? (true as const) : ariaInvalidProp,
    "aria-describedby":
      [describedByProp, hasMessage ? messageId : null]
        .filter(Boolean)
        .join(" ") || undefined,
  };
  const classes = cn(field({ size, invalid: Boolean(error) }), className);

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-label text-text">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-danger-700">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {multiline ? (
        <textarea
          {...(rest as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          {...common}
          rows={4}
          className={cn(classes, "h-auto min-h-24 py-3")}
        />
      ) : (
        <input {...rest} {...common} className={classes} />
      )}
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
