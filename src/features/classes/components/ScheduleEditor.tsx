"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Select } from "@/design-system";
import { DAY_LABELS, MAX_SLOTS, type ScheduleSlot } from "../model/classes";

type SlotErrors = Partial<Record<"day" | "start" | "end", string>> | undefined;

const DAY_OPTIONS = DAY_LABELS.map((label, i) => ({
  value: String(i + 1),
  label,
}));
const DEFAULT_SLOT: ScheduleSlot = { day: 1, start: "17:00", end: "19:00" };

export function ScheduleEditor({
  value,
  onChange,
  errors,
}: {
  value: ScheduleSlot[];
  onChange: (v: ScheduleSlot[]) => void;
  errors?: SlotErrors[];
}) {
  const patch = (index: number, change: Partial<ScheduleSlot>) =>
    onChange(value.map((s, i) => (i === index ? { ...s, ...change } : s)));

  return (
    <div className="flex flex-col gap-3">
      {value.map((slot, i) => {
        const n = i + 1;
        const err = errors?.[i];
        return (
          <div key={i} className="flex items-start gap-2">
            <div className="w-24">
              <Select
                size="md"
                aria-label={`${n}번째 요일`}
                options={DAY_OPTIONS}
                value={String(slot.day)}
                error={err?.day}
                onChange={(e) => patch(i, { day: Number(e.target.value) })}
              />
            </div>
            <Input
              size="md"
              type="time"
              aria-label={`${n}번째 시작 시각`}
              value={slot.start}
              error={err?.start}
              onChange={(e) => patch(i, { start: e.target.value })}
            />
            <span aria-hidden="true" className="pt-2 text-text-muted">
              ~
            </span>
            <Input
              size="md"
              type="time"
              aria-label={`${n}번째 끝나는 시각`}
              value={slot.end}
              error={err?.end}
              onChange={(e) => patch(i, { end: e.target.value })}
            />
            <Button
              variant="ghost"
              size="md"
              icon={Trash2}
              aria-label={`${n}번째 시간 삭제`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              삭제
            </Button>
          </div>
        );
      })}
      <div>
        <Button
          variant="secondary"
          size="md"
          icon={Plus}
          disabled={value.length >= MAX_SLOTS}
          onClick={() => onChange([...value, DEFAULT_SLOT])}
        >
          시간 추가
        </Button>
      </div>
    </div>
  );
}
