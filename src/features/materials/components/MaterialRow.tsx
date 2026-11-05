"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Download, FileText } from "lucide-react";
import { Button, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import { formatSize, type Material } from "../model/materials";
import { useDeleteMaterial, useDownloadMaterial } from "../state/useMaterials";

/** 자료 한 줄: 제목·파일 이름·크기·날짜 + 내려받기(원장은 삭제도). */
export function MaterialRow({
  material: m,
  canDelete = false,
}: {
  material: Material;
  canDelete?: boolean;
}) {
  const toast = useToast();
  const download = useDownloadMaterial();
  const del = useDeleteMaterial();
  const [confirming, setConfirming] = useState(false);

  async function onDownload() {
    try {
      await download.mutateAsync(m);
    } catch (e) {
      toast.show({ tone: "danger", message: classifyError(e).message });
    }
  }

  async function onDelete() {
    try {
      await del.mutateAsync(m);
      toast.show({ tone: "success", message: "자료를 지웠어요." });
    } catch (e) {
      setConfirming(false);
      toast.show({ tone: "danger", message: saveErrorMessage(e) });
    }
  }

  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-3 last:border-b-0">
      <FileText
        size={20}
        aria-hidden="true"
        className="shrink-0 text-text-muted"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-label break-words text-text">{m.title}</p>
        <p className="text-caption break-all text-text-muted">
          {`${m.fileName} · ${formatSize(m.sizeBytes)} · ${format(new Date(m.createdAt), "M/d")}`}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          disabled={download.isPending}
          onClick={() => void onDownload()}
          aria-label={`${m.title} 내려받기`}
        >
          내려받기
        </Button>
        {canDelete ? (
          confirming ? (
            <>
              <Button
                variant="danger"
                size="sm"
                disabled={del.isPending}
                onClick={() => void onDelete()}
              >
                지우기
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                취소
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              삭제
            </Button>
          )
        ) : null}
      </div>
    </li>
  );
}
