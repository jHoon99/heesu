"use client";

import { Pencil } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 홈페이지 관리 화면에서 고칠 수 있는 부분을 점선으로 두르고, 누르면 수정 창을 열어요.
 * 버튼이 부분 전체를 덮어서 안의 링크·폼은 눌리지 않아요.
 */
export function EditableRegion({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${label} 고치기`}
        className="group absolute -inset-2 rounded-xl outline-2 outline-offset-0 outline-primary/40 transition-colors duration-(--dur-fast) outline-dashed hover:bg-primary-soft/40 hover:outline-primary focus-visible:bg-primary-soft/40 focus-visible:outline-primary"
      >
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-caption font-semibold text-text-on-brand shadow-sm">
          <Pencil size={12} aria-hidden="true" />
          {label} 고치기
        </span>
      </button>
    </div>
  );
}
