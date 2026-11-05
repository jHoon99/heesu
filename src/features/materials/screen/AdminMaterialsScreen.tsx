"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buttonVariants, Card, Tabs } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { useClasses } from "@/features/classes";
import { MaterialRow } from "../components/MaterialRow";
import { MaterialUploadForm } from "../components/MaterialUploadForm";
import { useClassMaterials } from "../state/useMaterials";

/** 학습 자료실(원장): 반을 골라 자료를 올리고 지워요. 그 반 학생(퇴원 제외)만 내려받을 수 있어요. */
export function AdminMaterialsScreen() {
  const router = useRouter();
  const classParam = useSearchParams().get("class");
  const classes = useClasses();
  const list = classes.data ?? [];
  const classId = list.some((c) => c.id === classParam)
    ? classParam
    : (list[0]?.id ?? null);
  const materials = useClassMaterials(classId);

  let body;
  if (classes.isError && classes.data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(classes.error).message}
      </p>
    );
  } else if (classes.isPending) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (classId === null) {
    body = (
      <Card tone="raised">
        <p className="text-body text-text-muted">먼저 반을 만들어 주세요.</p>
        <Link
          href="/admin/classes"
          className={`${buttonVariants({ variant: "secondary", size: "md" })} mt-4`}
        >
          반 관리로
        </Link>
      </Card>
    );
  } else {
    let items;
    if (materials.isError && materials.data === undefined) {
      items = (
        <p role="alert" className="text-body-sm text-danger-700">
          {classifyError(materials.error).message}
        </p>
      );
    } else if (materials.isPending) {
      items = (
        <p role="status" className="text-body-sm text-text-muted">
          불러오는 중이에요.
        </p>
      );
    } else if (materials.data.length === 0) {
      items = (
        <p className="text-body-sm text-text-muted">
          이 반에 올린 자료가 없어요. 위에서 첫 자료를 올려 주세요.
        </p>
      );
    } else {
      items = (
        <ul className="flex flex-col">
          {materials.data.map((m) => (
            <MaterialRow key={m.id} material={m} canDelete />
          ))}
        </ul>
      );
    }
    body = (
      <>
        <div className="min-w-0 overflow-x-auto">
          <Tabs
            ariaLabel="반"
            items={list.map((c) => ({ value: c.id, label: c.name }))}
            value={classId}
            onChange={(id) =>
              router.replace(`/admin/materials?class=${encodeURIComponent(id)}`)
            }
          />
        </div>
        <Card tone="raised" title="자료 올리기">
          <MaterialUploadForm key={classId} classId={classId} />
        </Card>
        <Card tone="raised" title="올린 자료">
          {items}
        </Card>
      </>
    );
  }

  return (
    <div className="flex max-w-[720px] min-w-0 flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">학습 자료실</h1>
      {body}
    </div>
  );
}
