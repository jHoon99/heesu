"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { classifyError } from "@/core/supabase/error";
import { Button } from "@/design-system";
import { GuardianRecordView } from "../components/GuardianRecordView";
import { GUARDIAN_LINK_ERROR, isGuardianLinkError } from "../model/guardian";
import { useGuardianView } from "../state/useGuardian";
import { useGuardianToken } from "../state/useGuardianToken";

function Frame({ children, busy }: { children?: ReactNode; busy?: boolean }) {
  return (
    <main
      aria-busy={busy ? true : undefined}
      className="mx-auto min-h-dvh max-w-[480px] bg-bg-page px-5 py-8"
    >
      {children}
    </main>
  );
}

function LinkError() {
  return (
    <p role="alert" className="text-body text-text">
      {GUARDIAN_LINK_ERROR}
    </p>
  );
}

export function GuardianScreen() {
  const { token, ready, forget } = useGuardianToken();
  const query = useGuardianView(token);
  const linkError = query.isError && isGuardianLinkError(query.error);

  useEffect(() => {
    if (linkError) forget();
  }, [linkError, forget]);

  if (!ready) return <Frame busy />;
  if (token === null || linkError) {
    return (
      <Frame>
        <LinkError />
      </Frame>
    );
  }
  if (query.data !== undefined) {
    return (
      <Frame>
        <GuardianRecordView view={query.data} />
      </Frame>
    );
  }
  if (query.isError) {
    return (
      <Frame>
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-body text-text">
            {classifyError(query.error).message}
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => void query.refetch()}
          >
            다시 불러오기
          </Button>
        </div>
      </Frame>
    );
  }
  return (
    <Frame>
      <p className="text-body text-text-muted">불러오는 중이에요.</p>
    </Frame>
  );
}
