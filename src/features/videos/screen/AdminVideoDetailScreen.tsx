"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  Button,
  buttonVariants,
  Card,
  Input,
  Modal,
  useToast,
} from "@/design-system";
import { classifyError } from "@/core/supabase/error";
import { saveErrorMessage } from "@/core/supabase/saveNotApplied";
import { useClasses } from "@/features/classes";
import {
  dayLabelOf,
  formatShortDate,
  toLocalDateKey,
} from "@/features/sessions";
import { VideoViewsTable } from "../components/admin/VideoViewsTable";
import {
  formatDuration,
  publishedAtFromDate,
  VIDEO_TITLE_MAX,
  videoFormSchema,
  schoolTagSchema,
} from "../model/videos";
import { buildViewRows, completeCount } from "../model/views";
import type { AdminVideo } from "../data/videos";
import {
  useAdminVideo,
  useDeleteVideo,
  useRoster,
  useUpdateVideo,
} from "../state/useAdminVideos";

const editSchema = videoFormSchema
  .pick({ title: true, publishedDate: true })
  .extend({ school: schoolTagSchema });
type EditInput = z.input<typeof editSchema>;
type EditValues = z.output<typeof editSchema>;

function Loading() {
  return (
    <p role="status" className="text-body text-text-muted">
      불러오는 중이에요.
    </p>
  );
}

function NotFound() {
  return (
    <Card tone="raised">
      <p className="text-body text-text">
        영상을 찾을 수 없어요. 목록에서 다시 골라 주세요.
      </p>
      <Link
        href="/admin/videos"
        className={`${buttonVariants({ variant: "secondary", size: "md" })} mt-4`}
      >
        영상 목록으로
      </Link>
    </Card>
  );
}

function EditCard({ video }: { video: AdminVideo }) {
  const toast = useToast();
  const update = useUpdateVideo();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditInput, unknown, EditValues>({
    resolver: zodResolver(editSchema),
    mode: "onSubmit",
    defaultValues: {
      title: video.title,
      publishedDate: toLocalDateKey(new Date(video.publishedAt)),
      school: video.school ?? "",
    },
  });

  async function onValid(values: EditValues) {
    if (update.isPending) return;
    setError(null);
    try {
      await update.mutateAsync({
        id: video.id,
        patch: {
          title: values.title,
          // 날짜를 안 바꿨으면 공개 시각은 그대로 둬요.
          publishedAt:
            values.publishedDate === toLocalDateKey(new Date(video.publishedAt))
              ? undefined
              : publishedAtFromDate(values.publishedDate),
          school: values.school,
        },
      });
      toast.show({ tone: "success", message: "저장했어요." });
    } catch (e) {
      setError(saveErrorMessage(e));
    }
  }

  return (
    <Card tone="raised" className="max-w-[640px]">
      <form
        noValidate
        onSubmit={(e) => void handleSubmit(onValid)(e)}
        className="flex flex-col gap-5"
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
          required
          maxLength={VIDEO_TITLE_MAX}
          autoComplete="off"
          error={errors.title?.message}
          {...register("title")}
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
          label="내신 학교(선택)"
          maxLength={40}
          autoComplete="off"
          placeholder="예: 양현고"
          hint="적으면 이 학교 학생은 반이 달라도 '내신 강의실'에서 볼 수 있어요. 학생 정보의 학교 이름과 똑같이 적어 주세요."
          error={errors.school?.message}
          {...register("school")}
        />
        <div>
          <Button type="submit" size="md" disabled={update.isPending}>
            저장
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ViewsCard({ video }: { video: AdminVideo }) {
  const roster = useRoster(video.classId);
  let body;
  if (roster.isError && roster.data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(roster.error).message}
      </p>
    );
  } else if (roster.data === undefined) {
    body = <Loading />;
  } else if (roster.data.length === 0) {
    body = <p className="text-body text-text-muted">이 반에 학생이 없어요.</p>;
  } else {
    const rows = buildViewRows(roster.data, video.views, video.durationSeconds);
    body = (
      <>
        <p className="text-body text-text">
          다 본 학생 {completeCount(rows, video.durationSeconds)}/{rows.length}
          명
        </p>
        <VideoViewsTable rows={rows} duration={video.durationSeconds} />
      </>
    );
  }
  return (
    <Card tone="raised" className="flex flex-col gap-3">
      <h2 className="text-h3 text-text">시청 현황</h2>
      <p className="text-body-sm text-text-muted">
        시청 기록은 학생 기기가 보낸 값이라 참고용이에요.
      </p>
      {body}
    </Card>
  );
}

export function AdminVideoDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const id = useSearchParams().get("id") ?? "";
  const video = useAdminVideo(id);
  const classes = useClasses();
  const del = useDeleteVideo();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = video.data;

  async function remove() {
    if (!data) return;
    setConfirming(false);
    setError(null);
    const classId = data.classId;
    try {
      const { fileRemoved } = await del.mutateAsync({
        id: data.id,
        storagePath: data.storagePath,
      });
      toast.show(
        fileRemoved
          ? { tone: "success", message: "영상을 지웠어요." }
          : {
              tone: "info",
              message:
                "영상은 지웠어요. 파일 정리는 실패했지만 학생에게는 보이지 않아요.",
            },
      );
      router.push(`/admin/videos?class=${encodeURIComponent(classId)}`);
    } catch (e) {
      setError(saveErrorMessage(e));
    }
  }

  let title = "영상";
  let body;
  if (id === "") {
    body = <NotFound />;
  } else if (video.isError && data === undefined) {
    body = (
      <p role="alert" className="text-body text-danger-700">
        {classifyError(video.error).message}
      </p>
    );
  } else if (video.isPending || !video.isFetchedAfterMount) {
    body = <Loading />;
  } else if (!data) {
    body = <NotFound />;
  } else {
    title = data.title;
    const className = classes.data?.find((c) => c.id === data.classId)?.name;
    const key = toLocalDateKey(new Date(data.publishedAt));
    body = (
      <>
        <p className="text-body text-text-muted">
          {className ? `${className} · ` : ""}
          {formatDuration(data.durationSeconds)} · 공개 {formatShortDate(key)}(
          {dayLabelOf(key)})
        </p>
        {error ? (
          <p
            role="alert"
            className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700"
          >
            {error}
          </p>
        ) : null}
        <EditCard video={data} />
        <ViewsCard video={data} />
        <div>
          <Button
            variant="danger"
            size="md"
            disabled={del.isPending}
            onClick={() => setConfirming(true)}
          >
            영상 지우기
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-h2 text-text">{title}</h1>
      {body}
      <Modal
        open={confirming}
        title="이 영상을 지울까요?"
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setConfirming(false)}
            >
              취소
            </Button>
            <Button variant="danger" size="md" onClick={() => void remove()}>
              지우기
            </Button>
          </>
        }
      >
        학생 시청 기록도 함께 지워지고 되돌릴 수 없어요.
      </Modal>
    </div>
  );
}
