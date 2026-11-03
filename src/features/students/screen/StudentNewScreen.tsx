"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { Button, Card, Input, Select, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { GRADES } from "@/features/consultations";
import {
  StudentFunctionError,
  studentCreateSchema,
  todayLocal,
  type StudentCreateInput,
  type StudentCreateOutput,
} from "../model/students";
import { useCreateStudent } from "../state/useStudents";

export function StudentNewScreen() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateStudent();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StudentCreateInput, unknown, StudentCreateOutput>({
    resolver: zodResolver(studentCreateSchema),
    mode: "onSubmit",
    defaultValues: {
      loginId: "",
      password: "",
      name: "",
      grade: "",
      joinedAt: todayLocal(),
    } as unknown as StudentCreateInput,
  });

  async function onSubmit(input: StudentCreateOutput) {
    setFormError(null);
    try {
      const id = await create.mutateAsync(input);
      toast.show({
        tone: "success",
        message:
          "학생을 추가했어요. 아이디와 초기 비밀번호를 학생에게 알려 주세요.",
      });
      router.push(`/admin/students/detail?id=${encodeURIComponent(id)}`);
    } catch (e) {
      if (e instanceof StudentFunctionError) {
        if (e.code === "login_taken") {
          setError("loginId", { message: e.message });
        } else if (e.code === "invalid") {
          setFormError(e.message);
        } else {
          toast.show({ tone: "danger", message: e.message });
        }
        return;
      }
      setFormError(classifyError(e).message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">학생 추가</h1>
      <Card tone="raised" className="max-w-[640px]">
        {formError ? (
          <p
            role="alert"
            className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {formError}
          </p>
        ) : null}
        <form
          noValidate
          onSubmit={(e) => {
            if (create.isPending) {
              e.preventDefault();
              return;
            }
            void handleSubmit(onSubmit)(e);
          }}
          className="flex flex-col gap-5"
        >
          <Input
            size="md"
            label="아이디"
            required
            autoComplete="off"
            autoCapitalize="none"
            maxLength={20}
            hint="영문 소문자·숫자·밑줄(_) 3~20자"
            error={errors.loginId?.message}
            {...register("loginId")}
          />
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                size="md"
                label="초기 비밀번호"
                required
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                hint="8자 이상. 학생이 처음 로그인할 때 바꿔요."
                error={errors.password?.message}
                {...register("password")}
              />
            </div>
            <Button
              variant="ghost"
              size="md"
              icon={showPassword ? EyeOff : Eye}
              className="mt-7"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "숨기기" : "보기"}
            </Button>
          </div>
          <Input
            size="md"
            label="이름"
            required
            maxLength={20}
            error={errors.name?.message}
            {...register("name")}
          />
          <Select
            size="md"
            label="학년"
            required
            placeholder="학년을 골라 주세요"
            options={[...GRADES]}
            error={errors.grade?.message}
            {...register("grade")}
          />
          <Input
            size="md"
            label="등록일"
            type="date"
            error={errors.joinedAt?.message}
            {...register("joinedAt")}
          />
          <div className="flex gap-2">
            <Button type="submit" size="md" disabled={create.isPending}>
              추가
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => router.push("/admin/students")}
            >
              취소
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
