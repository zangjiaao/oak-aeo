import type { Metadata } from "next";
import { DiagnosisPage } from "@/components/pages/diagnosis-page";

export const metadata: Metadata = { title: "诊断分析" };

export default function Page() {
  return <DiagnosisPage />;
}
