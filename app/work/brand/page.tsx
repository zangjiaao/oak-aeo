import type { Metadata } from "next";
import { BrandPage } from "@/components/pages/brand-page";

export const metadata: Metadata = { title: "品牌设置" };

export default function Page() {
  return <BrandPage />;
}
