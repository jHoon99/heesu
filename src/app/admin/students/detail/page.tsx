import { Suspense } from "react";
import { StudentDetailScreen } from "@/features/students";

export default function Page() {
  return (
    <Suspense>
      <StudentDetailScreen />
    </Suspense>
  );
}
