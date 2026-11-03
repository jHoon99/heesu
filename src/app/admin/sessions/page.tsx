import { Suspense } from "react";
import { SessionListScreen } from "@/features/sessions";

export default function Page() {
  return (
    <Suspense>
      <SessionListScreen />
    </Suspense>
  );
}
