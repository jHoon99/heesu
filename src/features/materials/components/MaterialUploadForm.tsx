"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, Input, useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import {
  fileProblem,
  MATERIAL_ACCEPT,
  materialFormSchema,
  type MaterialFormInput,
  type MaterialFormOutput,
} from "../model/materials";
import { useUploadMaterial } from "../state/useMaterials";

const PICK_MESSAGE = "올릴 파일을 골라 주세요.";

/** 반 하나에 자료 올리기: 제목 + 파일(PDF·이미지·한글·워드, 20MB까지). */
export function MaterialUploadForm({ classId }: { classId: string }) {
  const toast = useToast();
  const upload = useUploadMaterial();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MaterialFormInput, unknown, MaterialFormOutput>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: { title: "" },
  });

  async function onSubmit(input: MaterialFormOutput) {
    setError(null);
    if (file === null) {
      setFileError(PICK_MESSAGE);
      return;
    }
    try {
      await upload.mutateAsync({ classId, title: input.title, file });
      toast.show({ tone: "success", message: "자료를 올렸어요." });
      reset({ title: "" });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(classifyError(e).message);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        if (upload.isPending) {
          e.preventDefault();
          return;
        }
        void handleSubmit(onSubmit)(e);
      }}
      className="flex max-w-[480px] flex-col gap-3"
    >
      {error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
        >
          {error}
        </p>
      ) : null}
      <Input
        size="md"
        label="제목"
        placeholder="예: 3과 본문 프린트"
        maxLength={100}
        error={errors.title?.message}
        {...register("title")}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="material-file" className="text-label text-text">
          파일
        </label>
        <input
          id="material-file"
          ref={fileRef}
          type="file"
          accept={MATERIAL_ACCEPT}
          aria-invalid={fileError ? true : undefined}
          aria-describedby="material-file-msg"
          className="max-w-full text-body-sm text-text file:mr-3 file:h-10 file:rounded-md file:border file:border-primary file:bg-transparent file:px-4 file:text-label file:text-text-brand"
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            const problem = picked ? fileProblem(picked) : null;
            setFileError(problem);
            setFile(problem === null ? picked : null);
          }}
        />
        <p
          id="material-file-msg"
          className={
            fileError
              ? "text-caption text-danger-700"
              : "text-caption text-text-muted"
          }
        >
          {fileError ??
            "PDF·이미지(jpg·png)·한글(hwp·hwpx)·워드(doc·docx), 20MB까지 올릴 수 있어요."}
        </p>
      </div>
      <div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={upload.isPending}
        >
          {upload.isPending ? "올리는 중이에요" : "올리기"}
        </Button>
      </div>
    </form>
  );
}
