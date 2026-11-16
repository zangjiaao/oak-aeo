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
} from "@astryxdesign/core/Chat";
import { Heading, Text } from "@astryxdesign/core/Text";
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutPanel,
  VStack,
} from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Timestamp } from "@astryxdesign/core/Timestamp";

const SESSIONS = [
  { title: "引导 · okdata", state: "进行中", selected: true },
  { title: "词根初稿", state: "还没开始", selected: false },
];

export function AgentPage() {
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader>
          <HStack hAlign="between" vAlign="center">
            <VStack gap={0.5}>
              <Heading level={1}>Agent</Heading>
              <Text type="supporting" color="secondary">
                同一条引导会话。说「已更新」只表示写了草稿。
              </Text>
            </VStack>
            <HStack gap={2} vAlign="center">
              <Text type="supporting" color="secondary">
                预算 $0.00 / $0.50
              </Text>
              <Button label="新建任务" variant="secondary" isDisabled />
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      start={
        <LayoutPanel width={240} padding={4} label="会话">
          <VStack gap={2}>
            <Text type="label">会话</Text>
            {SESSIONS.map((session) => (
              <Card key={session.title} padding={3} variant={session.selected ? "muted" : "default"}>
                <VStack gap={1}>
                  <Text type="body">{session.title}</Text>
                  <HStack gap={2} vAlign="center">
                    <StatusDot
                      variant={session.selected ? "accent" : "neutral"}
                      label={session.state}
                    />
                    <Text type="supporting" color="secondary">
                      {session.state}
                    </Text>
                  </HStack>
                </VStack>
              </Card>
            ))}
          </VStack>
        </LayoutPanel>
      }
      end={
        <LayoutPanel width={280} padding={4} label="当前对象">
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center">
              <Heading level={2}>当前对象</Heading>
              <Badge variant="neutral" label="草稿" />
            </HStack>
            <Text type="body">接口数量，两条原文并存。</Text>
            <Text type="supporting" color="secondary">
              可回滚点：还没有。审核通过之后才会有。
            </Text>
            <Text type="supporting" color="secondary">
              今日采集配额：豆包 0/5，千问 0/5，DeepSeek 0/5，Kimi 0/5。
            </Text>
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={4}>
          <ChatLayout
            style={{ height: "100%", minHeight: 0 }}
            composer={
              <ChatComposer
                onSubmit={() => {}}
                placeholder="继续追问。这一步还不会写库。"
                input={<ChatComposerInput />}
              />
            }
          >
          <ChatMessageList>
              <ChatMessage sender="assistant" avatar={<Avatar name="Agent" size="md" />}>
                <ChatMessageBubble variant="ghost">
                  引导还停在事实确认。接口数量有冲突，等你裁决后我才写下一张词根卡。
                </ChatMessageBubble>
                <ChatMessageMetadata
                  timestamp={<Timestamp value="2026-11-16T19:22:00" format="time" />}
                />
              </ChatMessage>
            </ChatMessageList>
          </ChatLayout>
        </LayoutContent>
      }
    />
  );
}
