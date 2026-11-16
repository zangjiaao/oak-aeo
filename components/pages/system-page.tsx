"use client";

import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";

type QuotaRow = {
  id: string;
  platform: string;
  cap: string;
  used: string;
  channel: string;
};

const QUOTA: QuotaRow[] = [
  { id: "doubao", platform: "豆包", cap: "5", used: "0", channel: "web · 人工" },
  { id: "qwen", platform: "千问", cap: "5", used: "0", channel: "web · 人工" },
  { id: "deepseek", platform: "DeepSeek", cap: "5", used: "0", channel: "web · 人工" },
  { id: "kimi", platform: "Kimi", cap: "5", used: "0", channel: "web · 人工" },
];

const COLUMNS: TableColumn<QuotaRow>[] = [
  { key: "platform", header: "模型", width: proportional(1.2) },
  { key: "cap", header: "每日上限", width: proportional(1) },
  { key: "used", header: "今日已用", width: proportional(1) },
  { key: "channel", header: "通道", width: proportional(1.4) },
];

export function SystemPage() {
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader>
          <VStack gap={1}>
            <Heading level={1}>系统设置</Heading>
            <Text type="supporting" color="secondary">
              单用户，先不登录。密钥位留着，还没接 SERP 或模型。
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={5}>
            <VStack gap={2}>
              <Heading level={2}>采集配额</Heading>
              <Text type="supporting" color="secondary">
                第 6 次会被拦住。验证轮是 5 问 × 4 模型 × 1 次，不重复同一题来凑样本。
              </Text>
              <Table data={QUOTA} columns={COLUMNS} idKey="id" density="compact" />
            </VStack>
            <VStack gap={2}>
              <Heading level={2}>预算</Heading>
              <Text type="body">本月已花费 $0.00。单任务默认上限 $0.50。</Text>
            </VStack>
            <EmptyState
              title="池版本和审计日志都还是空的"
              description="度量池冻结、轮换和谁改了什么，等事实块能生效之后再记。"
            />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
