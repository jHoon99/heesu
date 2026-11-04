import { useState } from "react";
import { Button, Card, Input, Modal, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { passwordSchema } from "@/features/auth";
import { StudentFunctionError } from "../model/students";
import { useResetStudentPassword } from "../state/useStudents";

export function PasswordResetCard({
  studentId,
  left,
}: {
  studentId: string;
  left: boolean;
}) {
  const toast = useToast();
  const reset = useResetStudentPassword();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setPassword("");
    setError(null);
  }

  async function submit() {
    if (reset.isPending) return;
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setError(null);
    try {
      await reset.mutateAsync({ studentId, password: parsed.data });
      reset.reset();
      toast.show({
        tone: "success",
        message: "비밀번호를 초기화했어요. 새 비밀번호를 학생에게 알려 주세요.",
      });
      close();
    } catch (e) {
      reset.reset();
      setError(
        e instanceof StudentFunctionError
          ? e.message
          : classifyError(e).message,
      );
    }
  }

  return (
    <Card tone="raised" title="비밀번호 초기화">
      <div className="flex flex-col items-start gap-3">
        <p className="text-body-sm text-text-muted">
          학생이 비밀번호를 잊었을 때 새 초기 비밀번호를 정해요. 학생은 다음
          로그인 때 비밀번호를 바꾸게 돼요.
        </p>
        <Button
          variant="secondary"
          size="md"
          disabled={left}
          onClick={() => setOpen(true)}
        >
          비밀번호 초기화
        </Button>
        {left ? (
          <p className="text-caption text-text-muted">
            퇴원한 학생은 초기화할 수 없어요.
          </p>
        ) : null}
      </div>
      <Modal
        open={open}
        title="비밀번호를 초기화할까요?"
        onClose={close}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={close}>
              취소
            </Button>
            <Button
              size="md"
              disabled={reset.isPending}
              onClick={() => void submit()}
            >
              초기화
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {error ? (
            <p
              role="alert"
              className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
            >
              {error}
            </p>
          ) : null}
          <Input
            size="md"
            label="새 초기 비밀번호"
            type="text"
            autoComplete="off"
            hint="8자 이상. 학생이 처음 로그인할 때 바꿔요."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </Modal>
    </Card>
  );
}
