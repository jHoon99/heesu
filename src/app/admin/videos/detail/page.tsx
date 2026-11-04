import { Suspense } from "react";
import { AdminVideoDetailScreen } from "@/features/videos";

export default function Page() {
  return (
    <Suspense>
      <AdminVideoDetailScreen />
    </Suspense>
  );
}
