import { Suspense } from "react";
import { AdminVideoUploadScreen } from "@/features/videos";

export default function Page() {
  return (
    <Suspense>
      <AdminVideoUploadScreen />
    </Suspense>
  );
}
