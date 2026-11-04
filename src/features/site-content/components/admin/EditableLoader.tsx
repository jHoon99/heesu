"use client";

import type { ReactNode } from "react";
import { classifyError } from "@/core/supabase/error";
import {
  readEditable,
  type EditableSiteContent,
} from "../../model/siteContentWrite";
import { useSiteContentRows } from "../../state/useSiteContentEditor";

/** 편집 카드에 넘길 값을 새로 읽어요. 읽기 전에는 카드를 그리지 않아요. */
export function EditableLoader({
  children,
}: {
  children: (e: EditableSiteContent) => ReactNode;
}) {
  const query = useSiteContentRows();
  if (query.isError && query.data === undefined) {
    return (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(query.error).message}
      </p>
    );
  }
  if (query.data === undefined || !query.isFetchedAfterMount) {
    return (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  }
  // 카드는 처음 한 번만 값을 받아요. 다른 카드가 저장돼도 입력 중인 내용은 그대로예요.
  return <>{children(readEditable(query.data))}</>;
}
