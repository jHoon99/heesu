import { Suspense } from "react";
import { AdminVideoListScreen } from "@/features/videos";

export default function Page() {
  return (
    <Suspense>
      <AdminVideoListScreen />
    </Suspense>
  );
}
