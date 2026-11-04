import { Suspense } from "react";
import { StudentEditScreen } from "@/features/students";

export default function Page() {
  return (
    <Suspense>
      <StudentEditScreen />
    </Suspense>
  );
}
