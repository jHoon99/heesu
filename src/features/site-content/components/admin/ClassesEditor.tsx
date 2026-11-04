"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Input } from "@/design-system";
import {
  classesWriteSchema,
  MAX_CLASSES,
  type EditableClass,
} from "../../model/siteContentWrite";
import { EditorCard, useCardSave } from "./EditorCard";

const formSchema = z.object({ classes: classesWriteSchema });
type In = z.input<typeof formSchema>;
type Out = z.output<typeof formSchema>;

const EMPTY: EditableClass = {
  name: "",
  grades: "",
  schedule: "",
  capacity: "",
};

export function ClassesEditor({ initial }: { initial: EditableClass[] }) {
  const { save, error, pending } = useCardSave("classes");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(formSchema),
    defaultValues: { classes: initial },
  });
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "classes",
  });
  const full = fields.length >= MAX_CLASSES;
  const listMessage = errors.classes?.message ?? errors.classes?.root?.message;

  return (
    <EditorCard
      title="반·시간표"
      saveLabel="반·시간표 저장"
      pending={pending}
      error={error}
      onSubmit={(e) => void handleSubmit((v) => save(v.classes))(e)}
    >
      <p className="text-body-sm text-text-muted">
        여기 목록은 랜딩 표시용이에요. 실제 반은 &apos;반&apos; 화면에서
        관리해요.
      </p>
      {fields.map((field, i) => {
        const rowErrors = errors.classes?.[i];
        return (
          <div
            key={field.id}
            className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-3"
          >
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                size="md"
                label="반 이름"
                error={rowErrors?.name?.message}
                {...register(`classes.${i}.name`)}
              />
              <Input
                size="md"
                label="대상 학년"
                error={rowErrors?.grades?.message}
                {...register(`classes.${i}.grades`)}
              />
              <Input
                size="md"
                label="요일·시간"
                placeholder="월·수 17:00–19:00"
                error={rowErrors?.schedule?.message}
                {...register(`classes.${i}.schedule`)}
              />
              <Input
                size="md"
                label="정원"
                inputMode="numeric"
                error={rowErrors?.capacity?.message}
                {...register(`classes.${i}.capacity`)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                icon={ArrowUp}
                aria-label="위로 옮기기"
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              />
              <Button
                type="button"
                variant="ghost"
                size="md"
                icon={ArrowDown}
                aria-label="아래로 옮기기"
                disabled={i === fields.length - 1}
                onClick={() => move(i, i + 1)}
              />
              <Button
                type="button"
                variant="ghost"
                size="md"
                icon={Trash2}
                aria-label="이 반 지우기"
                onClick={() => remove(i)}
              />
            </div>
          </div>
        );
      })}
      {listMessage ? (
        <p className="text-caption text-danger-700">{listMessage}</p>
      ) : null}
      <div className="flex flex-col items-start gap-1.5">
        <Button
          type="button"
          variant="secondary"
          size="md"
          icon={Plus}
          disabled={full}
          onClick={() => append(EMPTY)}
        >
          반 추가
        </Button>
        {full ? (
          <p className="text-caption text-text-muted">
            반은 10개까지 넣을 수 있어요.
          </p>
        ) : null}
      </div>
    </EditorCard>
  );
}
