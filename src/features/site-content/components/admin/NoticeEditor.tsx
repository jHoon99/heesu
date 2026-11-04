"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Checkbox, Input } from "@/design-system";
import {
  noticeWriteSchema,
  type EditableSiteContent,
} from "../../model/siteContentWrite";
import { EditorCard, useCardSave } from "./EditorCard";

type In = z.input<typeof noticeWriteSchema>;
type Out = z.output<typeof noticeWriteSchema>;

export function NoticeEditor({
  initial,
}: {
  initial: EditableSiteContent["notice"];
}) {
  const { save, error, pending } = useCardSave("notice");
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
      <Checkbox label="랜딩에 공지 띠 보이기" {...register("visible")} />
    </EditorCard>
  );
}
