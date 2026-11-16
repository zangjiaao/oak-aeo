import type { Metadata } from "next";
import { GuideScreen } from "@/components/guide-screen";

export const metadata: Metadata = {
  title: "引导",
};

export default function HomePage() {
  return <GuideScreen />;
}
