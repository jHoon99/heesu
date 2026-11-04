const DURATION_MESSAGE =
  "영상 길이를 읽지 못했어요. mp4 파일이 맞는지 확인해 주세요.";

/** 브라우저에서 영상 메타데이터만 읽어 길이(초, 1 이상 정수)를 돌려줘요. */
export function readVideoDuration(
  file: File,
  timeoutMs = 15_000,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;

    const finish = (result: { seconds: number } | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("error", onError);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      if (result) resolve(result.seconds);
      else reject(new Error(DURATION_MESSAGE));
    };
    const onMetadata = () => {
      const d = video.duration;
      finish(
        Number.isFinite(d) && d > 0
          ? { seconds: Math.max(1, Math.round(d)) }
          : null,
      );
    };
    const onError = () => finish(null);
    const timer = setTimeout(() => finish(null), timeoutMs);

    video.preload = "metadata";
    video.muted = true;
    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("error", onError);
    video.src = url;
  });
}
