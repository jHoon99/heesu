"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../cn";

export interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
}

export function Radio({
  label,
  description,
  error,
  id,
  className,
  "aria-describedby": describedByProp,
  "aria-invalid": ariaInvalidProp,
  ...rest
}: RadioProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = `${inputId}-desc`;
  const errId = `${inputId}-err`;
  const describedBy =
    [describedByProp, description ? descId : null, error ? errId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex items-start gap-3">
      {/* aria-invalid on radio is flagged by the lint rule, but the spec requires it */}
      {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props */}
      <input
        {...rest}
        id={inputId}
        type="radio"
        aria-invalid={error ? true : ariaInvalidProp}
        aria-describedby={describedBy}
        className={cn(
          "mt-0.5 size-5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed",
          className,
        )}
      />
      <div className="flex flex-col">
        <label
          htmlFor={inputId}
          className="cursor-pointer text-body text-text has-[:disabled]:cursor-not-allowed"
        >
          {label}
        </label>
        {description ? (
          <span id={descId} className="text-caption text-text-muted">
            {description}
          </span>
        ) : null}
        {error ? (
          <p id={errId} className="text-caption text-danger-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
