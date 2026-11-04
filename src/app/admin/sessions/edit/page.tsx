import { Suspense } from "react";
import { SessionFormScreen } from "@/features/sessions";

export default function Page() {
  return (
    <Suspense>
      <SessionFormScreen mode="edit" />
    </Suspense>
  );
}
