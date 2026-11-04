"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Input } from "@/design-system";
import {
  contactWriteSchema,
  type EditableSiteContent,
} from "../../model/siteContentWrite";
import { EditorCard, useCardSave, type EditorMode } from "./EditorCard";

type In = z.input<typeof contactWriteSchema>;
type Out = z.output<typeof contactWriteSchema>;

export function ContactEditor({
  initial,
  bare,
  onSaved,
}: {
  initial: EditableSiteContent["contact"];
} & EditorMode) {
  const { save, error, pending } = useCardSave("contact", onSaved);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(contactWriteSchema),
    defaultValues: initial,
  });
  return (
    <EditorCard
      bare={bare}
      title="연락처"
      saveLabel="연락처 저장"
      pending={pending}
      error={error}
      onSubmit={(e) => void handleSubmit((v) => save(v))(e)}
    >
      <Input
        size="md"
        label="전화번호"
        inputMode="tel"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Input
        size="md"
        label="주소"
        error={errors.address?.message}
        {...register("address")}
      />
    </EditorCard>
  );
}
