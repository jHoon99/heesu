import { Suspense } from "react";
import { VideoPlayerScreen } from "@/features/videos";

export default function Page() {
  return (
    <Suspense>
      <VideoPlayerScreen />
    </Suspense>
  );
}
