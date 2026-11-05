import { Suspense } from "react";
import { MyRecordsScreen } from "@/features/my-records";

export default function Page() {
  return (
    <Suspense>
      <MyRecordsScreen />
    </Suspense>
  );
}
