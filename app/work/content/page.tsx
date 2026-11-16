import type { Metadata } from "next";
import { ContentPage } from "@/components/pages/content-page";

export const metadata: Metadata = { title: "内容" };

export default function Page() {
  return <ContentPage />;
}
