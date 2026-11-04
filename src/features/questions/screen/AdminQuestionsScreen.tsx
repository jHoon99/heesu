"use client";

import { useState } from "react";
import { Card, Tabs } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { AdminQuestionCard } from "../components/admin/AdminQuestionCard";
import { sortAdminQuestions } from "../model/questions";
import { useAdminQuestions } from "../state/useQuestions";

type Tab = "open" | "all";

export function AdminQuestionsScreen() {
  const [tab, setTab] = useState<Tab>("open");
  const query = useAdminQuestions();
  const all = sortAdminQuestions(query.data ?? []);
  const open = all.filter((q) => q.answeredAt === null);
  const shown = tab === "open" ? open : all;

  let body;
  if (query.isError && query.data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(query.error).message}
      </p>
    );
  } else if (query.isPending) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (shown.length === 0) {
    body = (
      <Card tone="raised">
        <p className="text-body text-text-muted">
          {tab === "open"
            ? "새 질문이 없어요. 학생이 질문하면 여기에 바로 떠요."
            : "아직 질문이 없어요."}
        </p>
      </Card>
    );
  } else {
    body = shown.map((q) => <AdminQuestionCard key={q.id} question={q} />);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">질문</h1>
      <Tabs
        variant="segment"
        ariaLabel="질문 보기"
        items={[
          { value: "open", label: "미답변", count: open.length },
          { value: "all", label: "전체" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />
      {body}
    </div>
  );
}
