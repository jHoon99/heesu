"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Input } from "@/design-system";
import {
  tuitionWriteSchema,
  type EditableSiteContent,
} from "../../model/siteContentWrite";
import { EditorCard, useCardSave, type EditorMode } from "./EditorCard";

type In = z.input<typeof tuitionWriteSchema>;
type Out = z.output<typeof tuitionWriteSchema>;

export function TuitionEditor({
  initial,
  bare,
  onSaved,
}: {
  initial: EditableSiteContent["tuition"];
} & EditorMode) {
  const { save, error, pending } = useCardSave("tuition", onSaved);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(tuitionWriteSchema),
    defaultValues: initial,
  });
  return (
    <EditorCard
      bare={bare}
      title="수강료·교재비"
      saveLabel="수강료 저장"
      pending={pending}
      error={error}
      onSubmit={(e) => void handleSubmit((v) => save(v))(e)}
    >
      <Input
        size="md"
        label="월 수강료"
        error={errors.monthly?.message}
        {...register("monthly")}
      />
      <Input
        size="md"
        label="교재비"
        error={errors.textbook?.message}
        {...register("textbook")}
      />
      <Input
        size="md"
        multiline
        label="안내 문구"
        error={errors.note?.message}
        {...register("note")}
      />
    </EditorCard>
  );
}
