"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Checkbox, Input } from "@/design-system";
import {
  noticeWriteSchema,
  type EditableSiteContent,
} from "../../model/siteContentWrite";
import { EditorCard, useCardSave, type EditorMode } from "./EditorCard";

type In = z.input<typeof noticeWriteSchema>;
type Out = z.output<typeof noticeWriteSchema>;

export function NoticeEditor({
  initial,
  bare,
  onSaved,
}: {
  initial: EditableSiteContent["notice"];
} & EditorMode) {
  const { save, error, pending } = useCardSave("notice", onSaved);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(noticeWriteSchema),
    defaultValues: initial,
  });
  return (
    <EditorCard
      bare={bare}
      title="공지"
      saveLabel="공지 저장"
      pending={pending}
      error={error}
      onSubmit={(e) => void handleSubmit((v) => save(v))(e)}
    >
      <Input
        size="md"
        label="제목"
        error={errors.title?.message}
        {...register("title")}
      />
      <Input
        size="md"
        multiline
        label="내용"
        error={errors.body?.message}
        {...register("body")}
      />
      <Checkbox label="홈페이지에 공지 띠 보이기" {...register("visible")} />
    </EditorCard>
  );
}
