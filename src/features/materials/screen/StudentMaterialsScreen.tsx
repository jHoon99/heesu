"use client";

import { Button, Card } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { MaterialRow } from "../components/MaterialRow";
import { groupByClass } from "../model/materials";
import { useMyMaterials } from "../state/useMaterials";

/** 학습 자료실(학생): 내 반 자료를 반별로 보고 내려받아요. */
export function StudentMaterialsScreen() {
  const query = useMyMaterials();

  let body;
  if (query.isError && query.data === undefined) {
    body = (
      <Card>
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-body text-danger-700">
            {classifyError(query.error).message}
          </p>
          <Button
            variant="secondary"
            block
            onClick={() => void query.refetch()}
          >
            다시 시도
          </Button>
        </div>
      </Card>
    );
  } else if (query.data === undefined) {
    body = <p className="text-body text-text-muted">불러오는 중이에요.</p>;
  } else if (query.data.length === 0) {
    body = (
      <Card>
        <p className="text-body text-text-muted">
          아직 올라온 자료가 없어요. 원장님이 올리면 여기에 보여요.
        </p>
      </Card>
    );
  } else {
    body = groupByClass(query.data).map((g) => (
      <Card key={g.className} title={g.className}>
        <ul className="flex flex-col">
          {g.items.map((m) => (
            <MaterialRow key={m.id} material={m} />
          ))}
        </ul>
      </Card>
    ));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-h1 text-text">학습 자료실</h1>
      {body}
    </div>
  );
}
