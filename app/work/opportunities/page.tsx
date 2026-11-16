import type { Metadata } from "next";
import { OpportunitiesPage } from "@/components/pages/opportunities-page";

export const metadata: Metadata = { title: "机会看板" };

export default function Page() {
  return <OpportunitiesPage />;
}
