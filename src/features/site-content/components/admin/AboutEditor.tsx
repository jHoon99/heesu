"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";
import { Button, Input } from "@/design-system";
import {
  aboutWriteSchema,
  EMPTY_ABOUT_LINK,
  MAX_ABOUT_LINKS,
  type EditableSiteContent,
} from "../../model/siteContentWrite";
import { EditorCard, useCardSave, type EditorMode } from "./EditorCard";

type In = z.input<typeof aboutWriteSchema>;
type Out = z.output<typeof aboutWriteSchema>;

/** 소개 섹션: 소개 글과, 블로그·인스타그램 글로 가는 링크 카드예요. */
export function AboutEditor({
  initial,
  bare,
  onSaved,
}: { initial: EditableSiteContent["about"] } & EditorMode) {
  const { save, error, pending } = useCardSave("about", onSaved);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(aboutWriteSchema),
    defaultValues: initial,
  });
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "items",
  });
  const full = fields.length >= MAX_ABOUT_LINKS;
  const listMessage = errors.items?.message ?? errors.items?.root?.message;

  return (
    <EditorCard
      bare={bare}
      title="소개"
      saveLabel="소개 저장"
      pending={pending}
      error={error}
      onSubmit={(e) => void handleSubmit((v) => save(v))(e)}
    >
      <Input
        size="md"
        multiline
        label="소개 글"
        hint="홈페이지 '희수영어를 소개해요' 아래에 보여요."
        error={errors.intro?.message}
        {...register("intro")}
      />
      <div className="flex flex-col gap-1">
        <h3 className="text-label text-text">소개 링크</h3>
        <p className="text-caption text-text-muted">
          블로그·인스타그램 글 주소를 붙여 넣으면 카드로 보여요. 제목과 주소를
          둘 다 비운 카드는 저장할 때 빠져요.
        </p>
      </div>
      {fields.map((field, i) => {
        const rowErrors = errors.items?.[i];
        return (
          <div
            key={field.id}
            className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-3"
          >
            <Input
              size="md"
              label="제목"
              placeholder="네이버 블로그 — 개원 이야기"
              error={rowErrors?.title?.message}
              {...register(`items.${i}.title`)}
            />
            <Input
              size="md"
              label="링크 주소"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://…"
              error={rowErrors?.url?.message}
              {...register(`items.${i}.url`)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                icon={ArrowUp}
                aria-label={`${i + 1}번째 링크 위로 옮기기`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              />
              <Button
                type="button"
                variant="ghost"
                size="md"
                icon={ArrowDown}
                aria-label={`${i + 1}번째 링크 아래로 옮기기`}
                disabled={i === fields.length - 1}
                onClick={() => move(i, i + 1)}
              />
              <Button
                type="button"
                variant="ghost"
                size="md"
                icon={Trash2}
                aria-label={`${i + 1}번째 링크 지우기`}
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
          onClick={() => append({ ...EMPTY_ABOUT_LINK })}
        >
          링크 추가
        </Button>
        {full ? (
          <p className="text-caption text-text-muted">
            링크는 10개까지 넣을 수 있어요.
          </p>
        ) : null}
      </div>
    </EditorCard>
  );
}
