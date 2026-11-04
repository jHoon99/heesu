"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Input } from "@/design-system";
import {
  legalWriteSchema,
  type EditableSiteContent,
} from "../../model/siteContentWrite";
import { EditorCard, useCardSave, type EditorMode } from "./EditorCard";

type In = z.input<typeof legalWriteSchema>;
type Out = z.output<typeof legalWriteSchema>;

export function LegalEditor({
  initial,
  bare,
  onSaved,
}: {
  initial: EditableSiteContent["legal"];
} & EditorMode) {
  const { save, error, pending } = useCardSave("legal", onSaved);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(legalWriteSchema),
    defaultValues: initial,
  });
  return (
    <EditorCard
      bare={bare}
      title="법정 표시"
      saveLabel="법정 표시 저장"
      pending={pending}
      error={error}
      onSubmit={(e) => void handleSubmit((v) => save(v))(e)}
    >
      <p className="text-body-sm text-text-muted">
        학원법 제15조에 따라 홈페이지 맨 아래에 보여요.
      </p>
      <Input
        size="md"
        label="학원 명칭"
        error={errors.academyName?.message}
        {...register("academyName")}
      />
      <Input
        size="md"
        label="등록번호"
        error={errors.registrationNo?.message}
        {...register("registrationNo")}
      />
      <Input
        size="md"
        label="교습과목"
        error={errors.subjects?.message}
        {...register("subjects")}
      />
      <Input
        size="md"
        multiline
        label="교습비 등 게시"
        error={errors.tuitionNotice?.message}
        {...register("tuitionNotice")}
      />
    </EditorCard>
  );
}
