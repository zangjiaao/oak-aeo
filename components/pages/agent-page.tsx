"use client";

import { Conversation } from "@/components/conversation";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";

export function AgentPage() {
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader>
          <VStack gap={0.5}>
            <Heading level={1}>Agent</Heading>
            <Text type="supporting" color="secondary">延续引导会话，消息保存后可继续查看。</Text>
          </VStack>
        </LayoutHeader>
      }
      start={
        <LayoutPanel width={240} padding={4} label="会话">
          <VStack gap={2}>
            <Text type="label">会话</Text>
            <Text type="body">引导 · okdata</Text>
            <Text type="supporting" color="secondary">当前会话 · 与引导页同步</Text>
          </VStack>
        </LayoutPanel>
      }
      end={
        <LayoutPanel width={280} padding={4} label="当前进度">
          <VStack gap={2}>
            <Heading level={2}>开场收集</Heading>
            <Text type="body">请描述产品，消息将保留在同一条会话中。</Text>
            <Text type="supporting" color="secondary">配置 DeepSeek 后，Pi Agent 会自动回复。口述事实需核验后才能生效。</Text>
          </VStack>
        </LayoutPanel>
      }
      content={<LayoutContent padding={4}><Conversation /></LayoutContent>}
    />
  );
}
