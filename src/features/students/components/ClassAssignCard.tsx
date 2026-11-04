import Link from "next/link";
import { useState } from "react";
import {
  Button,
  buttonVariants,
  Card,
  Checkbox,
  useToast,
} from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { SaveNotAppliedError } from "@/core/supabase/saveNotApplied";
import { formatSchedule, useClasses } from "@/features/classes";
import { diffClassIds } from "../model/detail";
import { useSetStudentClasses } from "../state/useStudentDetail";

export function ClassAssignCard({
  studentId,
  currentIds,
}: {
  studentId: string;
  currentIds: string[];
}) {
  const toast = useToast();
  const classes = useClasses();
  const save = useSetStudentClasses();
  const [picked, setPicked] = useState<string[]>(currentIds);
  const [error, setError] = useState<string | null>(null);

  const { add, remove } = diffClassIds(currentIds, picked);
  const changed = add.length > 0 || remove.length > 0;

  function toggle(id: string, on: boolean) {
    setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));
  }

  async function onSave() {
    setError(null);
    try {
      await save.mutateAsync({
        id: studentId,
        current: currentIds,
        next: picked,
      });
      toast.show({ tone: "success", message: "반 배정을 저장했어요." });
    } catch (e) {
      setError(
        e instanceof SaveNotAppliedError ? e.message : classifyError(e).message,
      );
    }
  }

  let body;
  if (classes.isError && classes.data === undefined) {
    body = (
      <p role="alert" className="text-body-sm text-danger-700">
        {classifyError(classes.error).message}
      </p>
    );
  } else if (!classes.data) {
    body = (
      <p role="status" className="text-body-sm text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (classes.data.length === 0) {
    body = (
      <div className="flex flex-col items-start gap-3">
        <p className="text-body-sm text-text-muted">먼저 반을 만들어 주세요.</p>
        <Link
          href="/admin/classes/new"
          className={buttonVariants({ variant: "secondary", size: "md" })}
        >
          반 만들기
        </Link>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {error ? (
          <p
            role="alert"
            className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {error}
          </p>
        ) : null}
        {classes.data.map((c) => (
          <Checkbox
            key={c.id}
            label={c.name}
            description={formatSchedule(c.schedule)}
            checked={picked.includes(c.id)}
            onChange={(e) => toggle(c.id, e.target.checked)}
          />
        ))}
        <div>
          <Button
            variant="secondary"
            size="md"
            disabled={!changed || save.isPending}
            onClick={() => void onSave()}
          >
            저장
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card tone="raised" title="반 배정">
      {body}
    </Card>
  );
}
