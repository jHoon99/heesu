"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Input } from "@/design-system";
import {
  contactWriteSchema,
  type EditableSiteContent,
} from "../../model/siteContentWrite";
import { EditorCard, useCardSave } from "./EditorCard";

type In = z.input<typeof contactWriteSchema>;
type Out = z.output<typeof contactWriteSchema>;

export function ContactEditor({
  initial,
}: {
  initial: EditableSiteContent["contact"];
}) {
  const { save, error, pending } = useCardSave("contact");
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
