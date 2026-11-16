"use client";

import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import {
  ChatComposer,
  ChatComposerInput,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatToolCalls,
} from "@astryxdesign/core/Chat";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Timestamp } from "@astryxdesign/core/Timestamp";

export function GuideScreen() {
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="center">
              <VStack gap={0.5}>
                <Text type="supporting" color="secondary">
                  引导态 · 无导航
                </Text>
                <Heading level={1}>把 okdata 交给工作台</Heading>
              </VStack>
              <Button href="/work/agent" variant="secondary" label="先看工作台" />
            </HStack>
            <Stepper activeStep={1} label="引导进度">
              <Step step={0} label="开场" />
              <Step step={1} label="事实" />
              <Step step={2} label="词根" />
              <Step step={3} label="拓词" />
              <Step step={4} label="冻结" />
              <Step step={5} label="体检" />
            </Stepper>
          </VStack>
        </LayoutHeader>
      }
      end={
        <LayoutPanel width={320} padding={4} label="已收集">
          <VStack gap={3}>
            <Heading level={2}>已收集</Heading>
            <ProgressBar value={18} label="完备度" hasValueLabel />
            <VStack gap={1}>
              <Text type="label">还缺</Text>
              <Text type="body">口径和边界还没从原文圈出来。</Text>
              <Text type="body">接口数量冲突未裁决。</Text>
              <Text type="supporting" color="secondary">
                口述「按次付费」只作内部备注，不能进内容。
              </Text>
            </VStack>
            <Text type="supporting" color="secondary">
              影响问句：池还没建，先不估。
            </Text>
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={4}>
          <ChatLayout
            composer={
              <ChatComposer
                onSubmit={() => {}}
                placeholder="接着说，或贴链接。文件上传这一步还没接上。"
                input={<ChatComposerInput />}
              />
            }
          >
            <ChatMessageList>
                <ChatMessage sender="assistant" avatar={<Avatar name="Agent" size="md" />}>
                  <ChatMessageBubble variant="ghost">
                    你的产品，用一句话说是什么？也可以贴官网、丢文件。口述我先记下，但不能升成可引用事实。
                  </ChatMessageBubble>
                  <ChatMessageMetadata
                    timestamp={<Timestamp value="2026-11-16T19:20:00" format="time" />}
                  />
                </ChatMessage>
                <ChatMessage sender="user">
                  <ChatMessageBubble>
                    okdata 是给 AI 用的公开社媒数据 API，按次付费。官网在 okdata.online。
                  </ChatMessageBubble>
                </ChatMessage>
                <ChatMessage sender="assistant" avatar={<Avatar name="Agent" size="md" />}>
                  <ChatToolCalls
                    calls={[
                      {
                        name: "fetch_source",
                        target: "okdata.online/llms.txt",
                        status: "complete",
                      },
                      {
                        name: "fetch_source",
                        target: "okdata.online/index.md",
                        status: "complete",
                      },
                    ]}
                  />
                  <ChatMessageBubble variant="ghost">
                    抓到两份官网原文，接口数量对不上。这是草稿，你点「对」之前不会生效。
                  </ChatMessageBubble>
                  <ChatMessageBubble variant="ghost" width="100%">
                    <Card padding={4}>
                      <VStack gap={2}>
                        <HStack hAlign="between" vAlign="center">
                          <Heading level={3}>事实块候选</Heading>
                          <Badge variant="warning" label="冲突" />
                        </HStack>
                        <Text type="body">
                          okdata 用一个 HTTP API 提供多平台公开社媒数据，按次计费。
                        </Text>
                        <Text type="supporting" color="secondary">
                          数值：llms.txt 写 235 个接口、23 个平台；首页写 230 个接口。两条都留着，等你裁决。
                        </Text>
                        <Text type="supporting" color="secondary">
                          出处：https://okdata.online/llms.txt · 快照尚未入库，这一步还是示意。
                        </Text>
                        <HStack gap={2}>
                          <Button label="对" variant="primary" size="sm" />
                          <Button label="改" variant="secondary" size="sm" />
                          <Button label="删" variant="ghost" size="sm" />
                        </HStack>
                      </VStack>
                    </Card>
                  </ChatMessageBubble>
                </ChatMessage>
              </ChatMessageList>
            </ChatLayout>
        </LayoutContent>
      }
    />
  );
}
