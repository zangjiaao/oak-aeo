"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Conversation } from "@/components/conversation";
import { onboardingStep } from "@/lib/onboarding-progress";
import type { ConversationHistory } from "@/lib/conversation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Layout, LayoutHeader } from "@astryxdesign/core/Layout";
import { Step, Stepper } from "@astryxdesign/core/Stepper";

export function GuideScreen() {
  const [history, setHistory] = useState<ConversationHistory | null>(null);
  const [sourceCount, setSourceCount] = useState(0);
  const [approvedFacts, setApprovedFacts] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/sources", { cache: "no-store", signal: controller.signal }),
      fetch("/api/facts", { cache: "no-store", signal: controller.signal }),
    ]).then(async ([sources, facts]) => {
      if (!sources.ok || !facts.ok) return;
      const sourceData = await sources.json() as { sources: unknown[] };
      const factData = await facts.json() as { facts: { status: string; tier: string }[] };
      if (controller.signal.aborted) return;
      setSourceCount(sourceData.sources.length);
      setApprovedFacts(factData.facts.filter((fact) => fact.status === "approved" && fact.tier === "A").length);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  const activeStep = onboardingStep(history, sourceCount, approvedFacts);
  return (
    <AppShell height="fill" variant="section" contentPadding={0} topNav={<AppHeader />}>
      <Layout
        height="fill"
        contentWidth={720}
        header={
          <LayoutHeader>
            <Stepper activeStep={activeStep} label="引导进度">
              <Step step={0} label="开场" />
              <Step step={1} label="事实" />
              <Step step={2} label="词根" />
              <Step step={3} label="拓词" />
              <Step step={4} label="冻结" />
              <Step step={5} label="体检" />
            </Stepper>
          </LayoutHeader>
        }
        content={<Conversation onHistoryChange={setHistory} />}
      />
    </AppShell>
  );
}
