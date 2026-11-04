import { Suspense } from "react";
import { AttendanceScreen } from "@/features/attendance";

export default function Page() {
  return (
    <Suspense>
      <AttendanceScreen />
    </Suspense>
  );
}
