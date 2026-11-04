"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buttonVariants, Card, Tabs } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { useClasses } from "@/features/classes";
import {
  AdminVideoTable,
  type AdminVideoRow,
} from "../components/admin/AdminVideoTable";
import { buildViewRows, completeCount } from "../model/views";
import { useAdminVideos, useRoster } from "../state/useAdminVideos";

function Message({ children }: { children: React.ReactNode }) {
  return <p className="text-body text-text-muted">{children}</p>;
}

export function AdminVideoListScreen() {
  const router = useRouter();
  const classParam = useSearchParams().get("class");
  const classes = useClasses();
  const list = classes.data ?? [];
  const classId = list.some((c) => c.id === classParam)
    ? classParam
    : (list[0]?.id ?? null);
  const videos = useAdminVideos(classId);
  const roster = useRoster(classId);

  const rows: AdminVideoRow[] = useMemo(() => {
    const members = roster.data;
    return (videos.data ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      durationSeconds: v.durationSeconds,
      publishedAt: v.publishedAt,
      completed: members
        ? completeCount(
            buildViewRows(members, v.views, v.durationSeconds),
            v.durationSeconds,
          )
        : null,
    }));
  }, [videos.data, roster.data]);

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
        <Message>먼저 반을 만들어 주세요.</Message>
        <Link
          href="/admin/classes"
          className={`${buttonVariants({ variant: "secondary", size: "md" })} mt-4`}
        >
          반 관리로
        </Link>
      </Card>
    );
  } else if (videos.isError && videos.data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(videos.error).message}
      </p>
    );
  } else if (videos.isPending) {
    body = (
      <p role="status" className="text-body text-text-muted">
        불러오는 중이에요.
      </p>
    );
  } else if (rows.length === 0) {
    body = (
      <Card tone="raised">
        <Message>
          이 반에 올린 영상이 없어요. &apos;영상 올리기&apos;로 첫 영상을 올려
          주세요.
        </Message>
      </Card>
    );
  } else {
    body = (
      <AdminVideoTable
        rows={rows}
        rosterSize={roster.data ? roster.data.length : null}
        now={new Date()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-h2 text-text">영상</h1>
        <Link
          href={`/admin/videos/new?class=${encodeURIComponent(classId ?? "")}`}
          className={buttonVariants({ variant: "primary", size: "md" })}
        >
          영상 올리기
        </Link>
      </div>
      {list.length > 0 && classId !== null ? (
        <Tabs
          ariaLabel="반"
          items={list.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={(id) =>
            router.replace(`/admin/videos?class=${encodeURIComponent(id)}`)
          }
        />
      ) : null}
      {body}
    </div>
  );
}
