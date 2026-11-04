"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { useClasses } from "@/features/classes";
import { VideoUploadForm } from "../components/admin/VideoUploadForm";
import { useUploadVideo, type UploadInput } from "../state/useUploadVideo";

export function AdminVideoUploadScreen() {
  const router = useRouter();
  const toast = useToast();
  const classParam = useSearchParams().get("class") ?? "";
  const classes = useClasses();
  const upload = useUploadVideo();
  const uploadedClass = useRef<string | null>(null);
  const announced = useRef(false);

  const phase = upload.state.phase;
  useEffect(() => {
    if (phase !== "done" || announced.current) return;
    announced.current = true;
    toast.show({ tone: "success", message: "영상을 올렸어요." });
    const classId = uploadedClass.current ?? "";
    router.push(`/admin/videos?class=${encodeURIComponent(classId)}`);
  }, [phase, router, toast]);

  function onStart(input: UploadInput) {
    uploadedClass.current = input.classId;
    void upload.start(input);
  }

  const list = classes.data ?? [];
  const defaultClassId = list.some((c) => c.id === classParam)
    ? classParam
    : "";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">영상 올리기</h1>
      {classes.isError && classes.data === undefined ? (
        <p
          role="alert"
          className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
        >
          {classifyError(classes.error).message}
        </p>
      ) : classes.isPending ? (
        <p role="status" className="text-body text-text-muted">
          불러오는 중이에요.
        </p>
      ) : (
        <VideoUploadForm
          classes={list.map((c) => ({ id: c.id, name: c.name }))}
          defaultClassId={defaultClassId}
          state={upload.state}
          onStart={onStart}
          onCancel={() => void upload.cancel()}
        />
      )}
    </div>
  );
}
