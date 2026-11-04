import { Suspense } from "react";
import { ClassFormScreen } from "@/features/classes";

export default function Page() {
  return (
    <Suspense>
      <ClassFormScreen mode="edit" />
    </Suspense>
  );
}
