import type { Metadata } from "next";
import { AgentPage } from "@/components/pages/agent-page";

export const metadata: Metadata = { title: "Agent" };

export default function Page() {
  return <AgentPage />;
}
