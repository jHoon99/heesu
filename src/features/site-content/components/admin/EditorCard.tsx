"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, useToast } from "@/design-system";
import type { Json } from "@/core/supabase/database.types";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import type { SiteContentKey } from "../../model/siteContentWrite";
import { useSaveSiteContent } from "../../state/useSiteContentEditor";

/** 카드마다 따로 저장해요. 저장 중에는 다시 저장하지 않아요. */
export function useCardSave(key: SiteContentKey) {
  const toast = useToast();
  const mutation = useSaveSiteContent();
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: NonNullable<Json>) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      await mutation.mutateAsync({ key, value });
      toast.show({ message: "랜딩에 반영했어요." });
    } catch (e) {
      setError(saveErrorMessage(e));
    } finally {
      busy.current = false;
    }
  }
  return { save, error, pending: mutation.isPending };
}

export function EditorCard({
  title,
  where,
  saveLabel,
  pending,
  error,
  onSubmit,
  children,
}: {
  title: string;
  /** 랜딩·학생 화면의 어디에 보이는지 한 줄로 알려요. */
  where?: string;
  saveLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <Card tone="raised" className="min-w-0">
      <form
        noValidate
        onSubmit={onSubmit}
        className="flex min-w-0 flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">{title}</h2>
          {where ? (
            <p className="text-caption text-text-muted">{where}</p>
          ) : null}
        </div>
        {children}
        {error ? (
          <p
            role="alert"
            className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {error}
          </p>
        ) : null}
        <div>
          <Button
            type="submit"
            variant="secondary"
            size="md"
            disabled={pending}
          >
            {saveLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
