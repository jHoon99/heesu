"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/design-system";
import { DEFAULT_POINTS_GOAL } from "../../model/siteContent";
import { pointsGoalWriteSchema } from "../../model/siteContentWrite";
import { EditorCard, useCardSave } from "./EditorCard";

const formSchema = z.object({ goal: pointsGoalWriteSchema });
type In = z.input<typeof formSchema>;
type Out = z.output<typeof formSchema>;

export function PointsGoalEditor({ initial }: { initial: string }) {
  const { save, error, pending } = useCardSave("points_goal");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(formSchema),
    defaultValues: { goal: initial },
  });
  return (
    <EditorCard
      title="보상 목표"
      where="학생 홈의 포인트 카드에 보여요."
      saveLabel="목표 저장"
      pending={pending}
      error={error}
      onSubmit={(e) => void handleSubmit((v) => save(v.goal))(e)}
    >
      <Input
        size="md"
        label="목표 포인트"
        inputMode="numeric"
        placeholder={String(DEFAULT_POINTS_GOAL)}
        hint="학생 홈 포인트 카드의 목표예요. 바꾸면 학생이 새 목표에 닿을 때 한 번 더 축하해요."
        error={errors.goal?.message}
        {...register("goal")}
      />
    </EditorCard>
  );
}
