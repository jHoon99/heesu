import { Suspense } from "react";
import { AdminMaterialsScreen } from "@/features/materials";

export default function Page() {
  return (
    <Suspense>
      <AdminMaterialsScreen />
    </Suspense>
  );
}
