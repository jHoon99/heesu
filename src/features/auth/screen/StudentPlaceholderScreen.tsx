"use client";

import { useSignOut } from "@/core/auth";
import { Button } from "@/design-system";
import { useMyStudent } from "../state/useMyStudent";

export function StudentPlaceholderScreen() {
  const signOut = useSignOut();
  const student = useMyStudent();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg-page px-4 text-center">
      {student.data ? (
        <h1 className="font-serif text-h2 text-text">
          {student.data.name}, 반가워요.
        </h1>
      ) : null}
      <p className="text-body text-text-muted">
        학생 화면은 곧 열려요. 조금만 기다려 주세요.
      </p>
      <Button variant="ghost" onClick={() => void signOut()}>
        로그아웃
      </Button>
    </main>
  );
}
