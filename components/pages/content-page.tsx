"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { TextArea } from "@astryxdesign/core/TextArea";

const DRAFT = `okdata 按次计费，没有月费。余额不过期。

这一段还没绑定事实块。数字若对不上快照，保存会被挡住。`;

export function ContentPage() {
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader>
          <HStack hAlign="between" vAlign="center">
            <VStack gap={1}>
              <Heading level={1}>内容</Heading>
              <Text type="supporting" color="secondary">
                三道闸通过后停在待人工发布。系统只导出，不投放。
              </Text>
            </VStack>
            <Button label="导出 Markdown" variant="secondary" isDisabled />
          </HStack>
        </LayoutHeader>
      }
      start={
        <LayoutPanel width={260} padding={4} label="工单">
          <VStack gap={2}>
            <Text type="label">工单</Text>
            <Card padding={3} variant="muted">
              <VStack gap={1}>
                <Text type="body">按次计费说明</Text>
                <Text type="supporting" color="secondary">
                  集群还没建 · 问句未绑定
                </Text>
                <Badge variant="neutral" label="草稿" />
              </VStack>
            </Card>
          </VStack>
        </LayoutPanel>
      }
      end={
        <LayoutPanel width={260} padding={4} label="绑定">
          <VStack gap={2}>
            <Heading level={2}>绑定</Heading>
            <Text type="body">事实块：无</Text>
            <Text type="body">目标问句：无</Text>
            <Text type="body">建议体裁：还没到这一步</Text>
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={4}>
          <VStack gap={3}>
              <TextArea
                label="正文"
                value={DRAFT}
                isReadOnly
                rows={10}
                description="示意稿。悬停看来源、数字闸门还没接。"
              />
              <HStack gap={2}>
                <Badge variant="warning" label="事实闸未跑" />
                <Badge variant="warning" label="内容闸未跑" />
                <Badge variant="warning" label="知识库闸未跑" />
              </HStack>
              <Text type="supporting" color="secondary">
                没有「发布」按钮。你在站外发完，再回来回填 URL。
              </Text>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
