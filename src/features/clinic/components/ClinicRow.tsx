"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { Badge, Button, useToast } from "@/design-system";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import {
  CLINIC_KIND_LABELS,
  clinicSource,
  type ClinicItem,
} from "../model/clinic";
import { useSetClinicStatus } from "../state/useClinic";

/** 클리닉 한 줄: 종류·출처·메모 + "끝냈어요" / "다시 열기". */
export function ClinicRow({
  item,
  who,
}: {
  item: ClinicItem;
  who?: ReactNode;
}) {
  const toast = useToast();
  const set = useSetClinicStatus();
  const open = item.status === "open";

  async function toggle() {
    try {
      await set.mutateAsync({ id: item.id, status: open ? "done" : "open" });
      toast.show({
        tone: "success",
        message: open
          ? "끝낸 보완으로 옮겼어요."
          : "다시 해야 할 보완으로 옮겼어요.",
      });
    } catch (e) {
      toast.show({ tone: "danger", message: saveErrorMessage(e) });
    }
  }

  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {who}
          <Badge tone={item.kind === "word_retest" ? "warning" : "brand"}>
            {CLINIC_KIND_LABELS[item.kind]}
          </Badge>
          <span className="text-caption text-text-muted">
            {clinicSource(item)}
            {item.doneAt
              ? ` · ${format(new Date(item.doneAt), "M/d")} 끝냄`
              : null}
          </span>
        </div>
        {item.memo ? (
          <p className="text-body-sm break-words text-text">{item.memo}</p>
        ) : null}
      </div>
      <Button
        variant={open ? "secondary" : "ghost"}
        size="sm"
        disabled={set.isPending}
        onClick={() => void toggle()}
      >
        {open ? "끝냈어요" : "다시 열기"}
      </Button>
    </li>
  );
}
