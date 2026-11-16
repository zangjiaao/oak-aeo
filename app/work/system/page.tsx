import type { Metadata } from "next";
import { SystemPage } from "@/components/pages/system-page";

export const metadata: Metadata = { title: "系统设置" };

export default function Page() {
  return <SystemPage />;
}
