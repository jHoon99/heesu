"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../cn";
import { Badge } from "../Badge/Badge";

export interface TabsProps {
  items: { value: string; label: ReactNode; count?: number }[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  variant?: "line" | "segment";
  ariaLabel?: string;
}

export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  variant = "line",
  ariaLabel,
}: TabsProps) {
  const [inner, setInner] = useState(defaultValue ?? items[0]?.value);
  const current = value ?? inner;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(index: number) {
    const next = items[index];
    if (!next) return;
    if (value === undefined) setInner(next.value);
    onChange?.(next.value);
    refs.current[index]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    let target: number;
    switch (e.key) {
      case "ArrowRight":
        target = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
        target = index === 0 ? last : index - 1;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    select(target);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex",
        variant === "line"
          ? "gap-6 border-b border-border"
          : "w-fit gap-1 rounded-lg bg-bg-subtle p-1",
      )}
    >
      {items.map((item, i) => {
        const selected = item.value === current;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 text-label whitespace-nowrap transition-colors duration-(--dur-instant)",
              variant === "line"
                ? cn(
                    "-mb-px h-10 border-b-2",
                    selected
                      ? "border-primary text-text-brand"
                      : "border-transparent text-text-muted hover:text-text",
                  )
                : cn(
                    "h-8 rounded-md px-3",
                    selected
                      ? "bg-bg-surface-raised text-text shadow-sm"
                      : "text-text-muted hover:text-text",
                  ),
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <Badge tone="count">{item.count}</Badge>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
