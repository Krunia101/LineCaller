import { Suspense } from "react";
import AdminClient from "./adminCLI";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminClient />
    </Suspense>
  );
}
