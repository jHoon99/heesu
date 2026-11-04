"use client";

import { format } from "date-fns";
import { useState } from "react";
import { Button, Card, Input, Modal, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { guardianUrl } from "../../model/guardian";
import {
  useGuardianLinkStatus,
  useIssueGuardianToken,
} from "../../state/useGuardian";

const DATE = "yyyy.MM.dd";

export function GuardianLinkCard({
  studentId,
  left,
}: {
  studentId: string;
  left: boolean;
}) {
  const toast = useToast();
  const status = useGuardianLinkStatus(studentId);
  const issue = useIssueGuardianToken(studentId);
  // 학생이 바뀌면 부모가 key로 다시 마운트해 지운다.
  // 원문 링크는 이 state에만 둔다(쿼리 캐시·storage·ref·로그 금지).
  const [url, setUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function create() {
    if (issue.isPending) return;
    setConfirmOpen(false);
    try {
      const token = await issue.mutateAsync();
      setUrl(guardianUrl(window.location.origin, token));
    } catch (e) {
      toast.show({ tone: "danger", message: classifyError(e).message });
    } finally {
      issue.reset();
    }
  }

  async function copy() {
    if (url === null) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.show({
        tone: "success",
        message: "링크를 복사했어요. 카톡으로 보내 주세요.",
      });
    } catch {
      toast.show({
        tone: "danger",
        message: "복사하지 못했어요. 링크 칸을 눌러 직접 복사해 주세요.",
      });
    }
  }

  if (left) {
    return (
      <Card tone="raised" title="학부모 링크">
        <p className="text-body-sm text-text-muted">
          퇴원한 학생은 학부모 링크를 만들 수 없어요.
        </p>
      </Card>
    );
  }

  const active = status.data ?? null;
  const loaded = status.isFetchedAfterMount || status.data !== undefined;
  let line: string | null = null;
  if (status.isError && status.data === undefined) {
    line = classifyError(status.error).message;
  } else if (loaded) {
    line = active
      ? `${format(new Date(active.createdAt), DATE)} 만듦 · ${format(new Date(active.expiresAt), DATE)}까지 열려요.`
      : "아직 만든 링크가 없어요. 링크를 만들어 학부모님께 카톡으로 보내 주세요.";
  }

  return (
    <Card tone="raised" title="학부모 링크">
      <div className="flex flex-col items-start gap-3">
        {line ? <p className="text-body-sm text-text-muted">{line}</p> : null}
        {loaded && !(status.isError && status.data === undefined) ? (
          <Button
            variant="secondary"
            size="md"
            disabled={issue.isPending}
            onClick={() => (active ? setConfirmOpen(true) : void create())}
          >
            {active ? "새 링크 만들기" : "링크 만들기"}
          </Button>
        ) : null}
        {url !== null ? (
          <div className="flex w-full min-w-0 flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  size="md"
                  label="학부모 링크"
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>
              <Button size="md" onClick={() => void copy()}>
                링크 복사
              </Button>
            </div>
            <p className="text-caption text-text-muted">
              이 링크는 지금만 보여요. 화면을 떠나면 다시 볼 수 없으니,
              잃어버리면 새 링크를 만들어 주세요.
            </p>
          </div>
        ) : null}
      </div>
      <Modal
        open={confirmOpen}
        title="새 링크를 만들까요?"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setConfirmOpen(false)}
            >
              취소
            </Button>
            <Button
              size="md"
              disabled={issue.isPending}
              onClick={() => void create()}
            >
              새 링크 만들기
            </Button>
          </>
        }
      >
        <p className="text-body text-text">
          새 링크를 만들면 지금 보낸 링크는 바로 열리지 않아요.
        </p>
      </Modal>
    </Card>
  );
}
