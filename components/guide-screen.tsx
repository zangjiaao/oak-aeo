"use client";

import { AppHeader } from "@/components/app-header";
import { Conversation } from "@/components/conversation";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Layout, LayoutHeader } from "@astryxdesign/core/Layout";
import { Step, Stepper } from "@astryxdesign/core/Stepper";

export function GuideScreen() {
  return (
    <AppShell height="fill" variant="section" contentPadding={0} topNav={<AppHeader />}>
      <Layout
        height="fill"
        contentWidth={720}
        header={
          <LayoutHeader>
            <Stepper activeStep={0} label="引导进度">
              <Step step={0} label="开场" />
              <Step step={1} label="事实" />
              <Step step={2} label="词根" />
              <Step step={3} label="拓词" />
              <Step step={4} label="冻结" />
              <Step step={5} label="体检" />
            </Stepper>
          </LayoutHeader>
        }
        content={<Conversation />}
      />
    </AppShell>
  );
}
