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
      title="수강료"
      saveLabel="수강료 저장"
      pending={pending}
      error={error}
      onSubmit={(e) => void handleSubmit((v) => save(v))(e)}
    >
      <Input
        size="md"
        label="중등 수강료"
        placeholder="월 00만원"
        error={errors.middle?.message}
        {...register("middle")}
      />
      <Input
        size="md"
        label="고등 수강료"
        placeholder="월 00만원"
        error={errors.high?.message}
        {...register("high")}
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
