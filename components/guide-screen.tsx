"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Conversation } from "@/components/conversation";
import { onboardingStep } from "@/lib/onboarding-progress";
import type { ConversationHistory } from "@/lib/conversation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";

const STEPS = ["开场", "事实", "词根", "拓词", "冻结", "体检"] as const;

function ProgressLabels({ activeStep, vertical }: { activeStep: number; vertical: boolean }) {
  const labels = STEPS.map((label, index) =>
    <Text key={label} as="p" display="block" role="listitem" aria-current={index === activeStep ? "step" : undefined}
      type={index === activeStep ? "large" : "body"}
      color={index === activeStep ? "accent" : index < activeStep ? "primary" : "secondary"}
      weight={index === activeStep ? "semibold" : "normal"}>{label}</Text>);
  return vertical ?
    <VStack role="list" aria-label="引导进度" gap={6}>{labels}</VStack> :
    <HStack role="list" aria-label="引导进度" gap={2} hAlign="between">{labels}</HStack>;
}

export function GuideScreen() {
  const hasSideProgress = useMediaQuery("(min-width: 1400px)");
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
  const conversation = <Conversation onHistoryChange={setHistory} />;
  return (
    <AppShell height="fill" variant="section" contentPadding={0} topNav={<AppHeader />}>
      {hasSideProgress ?
        <Layout height="fill" contentWidth={1600}
          start={<LayoutPanel width={220} padding={6} isScrollable={false} role="complementary" label="引导进度">
            <VStack height="100%" vAlign="center" hAlign="end">
              <ProgressLabels activeStep={activeStep} vertical />
            </VStack>
          </LayoutPanel>}
          content={<Layout height="fill" contentWidth={720} content={conversation} />}
          end={<LayoutPanel width={220} padding={0} isScrollable={false} aria-hidden="true" />}
        /> :
        <Layout height="fill" contentWidth={720}
          header={<LayoutHeader><ProgressLabels activeStep={activeStep} vertical={false} /></LayoutHeader>}
          content={conversation}
        />}
    </AppShell>
  );
}
