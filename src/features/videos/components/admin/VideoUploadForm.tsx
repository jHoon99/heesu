"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, Card, Input, Select } from "@/design-system";
import { toLocalDateKey } from "@/features/sessions";
import { readVideoDuration } from "../../data/duration";
import {
  FILE_TOO_LARGE_MESSAGE,
  formatDuration,
  formatMegabytes,
  isMp4File,
  MP4_ONLY_MESSAGE,
  VIDEO_MAX_BYTES,
  VIDEO_TITLE_MAX,
  videoFormSchema,
  type VideoFormValues,
} from "../../model/videos";
import type { UploadInput, UploadState } from "../../state/useUploadVideo";

type Picked = {
  file: File | null;
  duration: number | null;
  error: string | null;
  reading: boolean;
};

const NOTHING: Picked = {
  file: null,
  duration: null,
  error: null,
  reading: false,
};

export type VideoUploadFormProps = {
  classes: { id: string; name: string }[];
  defaultClassId: string;
  state: UploadState;
  onStart: (input: UploadInput) => void;
  onCancel: () => void;
};

export function VideoUploadForm({
  classes,
  defaultClassId,
  state,
  onStart,
  onCancel,
}: VideoUploadFormProps) {
  const [picked, setPicked] = useState<Picked>(NOTHING);
  const pickRun = useRef(0);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    mode: "onSubmit",
    defaultValues: {
      title: "",
      classId: defaultClassId,
      publishedDate: toLocalDateKey(new Date()),
    },
  });

  const locked =
    state.phase === "uploading" ||
    state.phase === "saving" ||
    state.phase === "done";

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const run = ++pickRun.current;
    const file = e.target.files?.[0] ?? null;
    if (file === null) return setPicked(NOTHING);
    if (!isMp4File(file)) {
      return setPicked({ ...NOTHING, file, error: MP4_ONLY_MESSAGE });
    }
    if (file.size > VIDEO_MAX_BYTES) {
      return setPicked({ ...NOTHING, file, error: FILE_TOO_LARGE_MESSAGE });
    }
    setPicked({ ...NOTHING, file, reading: true });
    readVideoDuration(file).then(
      (duration) => {
        if (pickRun.current === run) {
          setPicked({ ...NOTHING, file, duration });
        }
      },
      (err: unknown) => {
        if (pickRun.current === run) {
          setPicked({
            ...NOTHING,
            file,
            error: err instanceof Error ? err.message : MP4_ONLY_MESSAGE,
          });
        }
      },
    );
  }

  function onValid(values: VideoFormValues) {
    if (locked || picked.file === null || picked.duration === null) return;
    onStart({
      file: picked.file,
      classId: values.classId,
      title: values.title,
      publishedDate: values.publishedDate,
      durationSeconds: picked.duration,
    });
  }

  const fileHint =
    picked.duration !== null && picked.file
      ? `길이 ${formatDuration(picked.duration)} · ${formatMegabytes(picked.file.size)}MB`
      : picked.reading
        ? "영상 길이를 읽는 중이에요."
        : "mp4 파일만 올릴 수 있어요.";

  const pct =
    state.total > 0
      ? Math.min(100, Math.floor((state.sent * 100) / state.total))
      : 0;

  return (
    <Card tone="raised" className="max-w-[640px]">
      <form
        noValidate
        onSubmit={(e) => void handleSubmit(onValid)(e)}
        className="flex flex-col gap-5"
      >
        <fieldset disabled={locked} className="flex flex-col gap-5">
          <Input
            size="md"
            label="제목"
            required
            maxLength={VIDEO_TITLE_MAX}
            autoComplete="off"
            error={errors.title?.message}
            {...register("title")}
          />
          <Select
            size="md"
            label="반"
            required
            placeholder="반을 골라 주세요"
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            error={errors.classId?.message}
            {...register("classId")}
          />
          <Input
            size="md"
            label="공개일"
            type="date"
            hint="이 날부터 학생에게 보여요."
            error={errors.publishedDate?.message}
            {...register("publishedDate")}
          />
          <Input
            size="md"
            label="영상 파일"
            type="file"
            required
            accept="video/mp4,.mp4"
            className="py-2"
            hint={fileHint}
            error={picked.error ?? undefined}
            onChange={onFileChange}
          />
        </fieldset>

        {state.phase === "uploading" || state.phase === "saving" ? (
          <div className="flex flex-col gap-2">
            <div
              role="progressbar"
              aria-label="업로드 진행"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="h-2 overflow-hidden rounded-full bg-bg-subtle"
            >
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-body-sm text-text-muted">
              {state.phase === "saving"
                ? "영상 정보를 저장하는 중이에요."
                : `${pct}% · ${formatMegabytes(state.sent)}/${formatMegabytes(state.total)}MB`}
            </p>
          </div>
        ) : null}

        {state.phase === "error" && state.error ? (
          <p
            role="alert"
            className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {state.error}
          </p>
        ) : null}

        <div className="flex gap-2">
          {state.phase === "idle" ? (
            <Button type="submit" size="md" disabled={picked.duration === null}>
              올리기
            </Button>
          ) : state.phase === "error" ? (
            <Button type="submit" size="md" disabled={picked.duration === null}>
              다시 올리기
            </Button>
          ) : state.phase === "uploading" ? (
            <Button variant="secondary" size="md" onClick={onCancel}>
              취소
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
