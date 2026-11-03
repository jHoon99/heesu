"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Card, buttonVariants, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { ClassForm } from "../components/ClassForm";
import type { ClassFormOutput } from "../model/classes";
import { useClass, useSaveClass } from "../state/useClasses";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DUPLICATE_MESSAGE =
  "이미 같은 이름의 반이 있어요. 다른 이름을 입력해 주세요.";
const LIST_PATH = "/admin/classes";

function saveErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23505"
  ) {
    return DUPLICATE_MESSAGE;
  }
  return classifyError(error).message;
}

function NotFound() {
  return (
    <Card tone="raised">
      <p className="text-body text-text">
        반을 찾을 수 없어요. 목록에서 다시 골라 주세요.
      </p>
      <Link
        href={LIST_PATH}
        className={`${buttonVariants({ variant: "secondary", size: "md" })} mt-4`}
      >
        반 목록으로
      </Link>
    </Card>
  );
}

export function ClassFormScreen({ mode }: { mode: "new" | "edit" }) {
  const router = useRouter();
  const toast = useToast();
  const rawId = useSearchParams().get("id");
  const id =
    mode === "edit" && rawId !== null && UUID_RE.test(rawId) ? rawId : null;
  const existing = useClass(id);
  const save = useSaveClass();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(input: ClassFormOutput) {
    setError(null);
    try {
      await save.mutateAsync({ id, input });
      toast.show({ tone: "success", message: "반을 저장했어요." });
      router.push(LIST_PATH);
    } catch (e) {
      setError(saveErrorMessage(e));
    }
  }

  let body;
  if (mode === "edit" && id === null) {
    body = <NotFound />;
  } else if (mode === "edit" && existing.isPending) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (mode === "edit" && existing.isError) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(existing.error).message}
      </p>
    );
  } else if (mode === "edit" && !existing.data) {
    body = <NotFound />;
  } else {
    body = (
      <Card tone="raised" className="max-w-[640px]">
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {error}
          </p>
        ) : null}
        <ClassForm
          initial={existing.data ?? undefined}
          busy={save.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push(LIST_PATH)}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">
        {mode === "new" ? "반 추가" : "반 수정"}
      </h1>
      {body}
    </div>
  );
}
