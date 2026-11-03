"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../cn";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  description?: ReactNode;
}

export function Checkbox({
  label,
  description,
  id,
  className,
  ...rest
}: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = `${inputId}-desc`;

  return (
    <div className="flex items-start gap-3">
      <input
        {...rest}
        id={inputId}
        type="checkbox"
        aria-describedby={description ? descId : undefined}
        className={cn(
          "mt-0.5 size-5 shrink-0 cursor-pointer rounded-sm accent-primary disabled:cursor-not-allowed",
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
      </div>
    </div>
  );
}
