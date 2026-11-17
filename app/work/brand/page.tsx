import type { Metadata } from "next";
import { BrandPage } from "@/components/pages/brand-page";
import { Suspense } from "react";
import { Text } from "@astryxdesign/core/Text";

export const metadata: Metadata = { title: "品牌设置" };

export default function Page() {
  return <Suspense fallback={<Text type="body">正在加载品牌设置…</Text>}><BrandPage /></Suspense>;
}
