"use client";

import { ImagePlus, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/design-system";
import { ImageReadError } from "../../data/siteImages";
import { siteImageUrl } from "../../model/siteImages";
import { useUploadSiteImage } from "../../state/useSiteContentEditor";

function uploadErrorMessage(e: unknown): string {
  if (e instanceof ImageReadError) return e.message;
  return "사진을 올리지 못했어요. 인터넷 연결을 확인하고 다시 골라 주세요.";
}

/** 카드 사진: 고르면 바로 올리고, 저장 버튼을 눌러야 홈페이지에 반영돼요. */
export function AboutImageField({
  index,
  value,
  onChange,
}: {
  index: number;
  value: string;
  onChange: (path: string) => void;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadSiteImage();
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      onChange(await upload.mutateAsync(file));
    } catch (e) {
      setError(uploadErrorMessage(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-label text-text">
        대표 사진
      </label>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기, 최적화 없음
        <img
          src={siteImageUrl(value)}
          alt={`${index + 1}번째 카드 사진 미리보기`}
          className="aspect-[16/10] w-full max-w-60 rounded-md border border-border bg-bg-subtle object-cover"
        />
      ) : (
        <p className="text-caption text-text-muted">
          사진이 없으면 예시 그림이 보여요.
        </p>
      )}
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          icon={ImagePlus}
          disabled={upload.isPending}
          onClick={() => fileRef.current?.click()}
        >
          {upload.isPending
            ? "올리는 중…"
            : value
              ? "사진 바꾸기"
              : "사진 올리기"}
        </Button>
        {value && !upload.isPending ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            icon={X}
            onClick={() => onChange("")}
          >
            사진 빼기
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-caption text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
