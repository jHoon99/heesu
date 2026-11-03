"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Card, buttonVariants, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import { useClasses } from "@/features/classes";
import { SessionForm } from "../components/SessionForm";
import { toLocalDateKey, type SessionFormOutput } from "../model/sessions";
import { useSaveSession, useSession } from "../state/useSessions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DUPLICATE_MESSAGE =
  "이 반은 그 날짜에 이미 수업이 있어요. 목록에서 그 날짜를 열어 고쳐 주세요.";
const LIST_PATH = "/admin/sessions";

function isDuplicate(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23505"
  );
}

function NotFound() {
  return (
    <Card tone="raised">
      <p className="text-body text-text">
        수업을 찾을 수 없어요. 목록에서 다시 골라 주세요.
      </p>
      <Link
        href={LIST_PATH}
        className={`${buttonVariants({ variant: "secondary", size: "md" })} mt-4`}
      >
        수업일지로
      </Link>
    </Card>
  );
}

const Loading = () => (
  <p role="status" className="text-body text-text-muted">
    불러오는 중이에요.
  </p>
);

export function SessionFormScreen({ mode }: { mode: "new" | "edit" }) {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const rawId = params.get("id");
  const id =
    mode === "edit" && rawId !== null && UUID_RE.test(rawId) ? rawId : null;
  const existing = useSession(id);
  const classes = useClasses();
  const save = useSaveSession();
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | undefined>();

  async function onSubmit(classId: string, input: SessionFormOutput) {
    setError(null);
    setDateError(undefined);
    try {
      await save.mutateAsync({ id, classId, input });
      toast.show({ tone: "success", message: "수업일지를 저장했어요." });
      router.push(`${LIST_PATH}?class=${encodeURIComponent(classId)}`);
    } catch (e) {
      if (isDuplicate(e)) setDateError(DUPLICATE_MESSAGE);
      else setError(saveErrorMessage(e));
    }
  }

  const cancel = (classId: string | null) =>
    router.push(
      classId === null
        ? LIST_PATH
        : `${LIST_PATH}?class=${encodeURIComponent(classId)}`,
    );

  let body;
  if (mode === "edit" && id === null) {
    body = <NotFound />;
  } else if (
    (mode === "edit" && existing.isError && existing.data === undefined) ||
    (classes.isError && classes.data === undefined)
  ) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(existing.error ?? classes.error).message}
      </p>
    );
  } else if (
    classes.isPending ||
    (mode === "edit" && (existing.isPending || !existing.isFetchedAfterMount))
  ) {
    body = <Loading />;
  } else if (mode === "edit" && !existing.data) {
    body = <NotFound />;
  } else {
    const list = classes.data ?? [];
    const session = existing.data;
    const wanted = params.get("class");
    const preset =
      session?.classId ?? list.find((c) => c.id === wanted)?.id ?? "";
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
        <SessionForm
          mode={mode}
          classes={list}
          initial={{
            classId: preset,
            date: session?.date ?? toLocalDateKey(new Date()),
            summary: session?.summary ?? "",
            homework: session?.homework ?? "",
            homeworkDue: session?.homeworkDue ?? "",
          }}
          busy={save.isPending}
          dateError={dateError}
          onSubmit={onSubmit}
          onCancel={() => cancel(preset === "" ? null : preset)}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">
        {mode === "new" ? "수업 추가" : "수업 수정"}
      </h1>
      {body}
    </div>
  );
}
