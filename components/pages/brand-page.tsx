"use client";

import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";

type FactRow = {
  id: string;
  statement: string;
  tier: string;
  status: string;
  source: string;
};

const FACTS: FactRow[] = [
  {
    id: "count",
    statement: "接口数量：235 与 230 并存",
    tier: "A · 官网",
    status: "冲突",
    source: "llms.txt / index.md",
  },
  {
    id: "billing",
    statement: "无月费，余额不过期",
    tier: "A · 官网",
    status: "草稿",
    source: "index.md",
  },
];

const COLUMNS: TableColumn<FactRow>[] = [
  { key: "statement", header: "陈述", width: proportional(2.4) },
  { key: "tier", header: "级别", width: proportional(1) },
  {
    key: "status",
    header: "状态",
    width: proportional(1),
    renderCell: (row) =>
      row.status === "冲突" ? <Badge variant="warning" label="冲突" /> : row.status,
  },
  { key: "source", header: "来源", width: proportional(1.4) },
];

const TABS = [
  { value: "facts", label: "事实块" },
  { value: "seeds", label: "词根" },
  { value: "compliance", label: "合规口径" },
  { value: "audit", label: "技术体检" },
  { value: "channels", label: "发布渠道" },
] as const;

export function BrandPage() {
  const [tab, setTab] = useState("facts");

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader>
          <VStack gap={3}>
            <VStack gap={1}>
              <Heading level={1}>品牌设置</Heading>
              <Text type="supporting" color="secondary">
                A 级才能进以后的内容。C 级口述只留在内部。B 级默认不进对外草稿。
              </Text>
            </VStack>
            <TabList value={tab} onChange={setTab} aria-label="品牌分区">
              {TABS.map((item) => (
                <Tab key={item.value} value={item.value} label={item.label} />
              ))}
            </TabList>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          {tab === "facts" ? (
            <VStack gap={4}>
              <Table data={FACTS} columns={COLUMNS} idKey="id" density="compact" />
              <HStack gap={3} vAlign="stretch">
                <Card padding={4}>
                  <VStack gap={1}>
                    <Heading level={3}>llms.txt</Heading>
                    <Text type="body">235 个接口，23 个平台。</Text>
                    <Text type="supporting" color="secondary">
                      快照哈希：尚未抓取
                    </Text>
                  </VStack>
                </Card>
                <Card padding={4}>
                  <VStack gap={1}>
                    <Heading level={3}>index.md</Heading>
                    <Text type="body">230 个接口，23 个平台。</Text>
                    <Text type="supporting" color="secondary">
                      两条都留着，还没有裁决人。
                    </Text>
                  </VStack>
                </Card>
              </HStack>
            </VStack>
          ) : null}
          {tab === "seeds" ? (
            <EmptyState
              title="词根还没生成"
              description="下一步是在引导里勾选词根，并强制写上买家译法。"
            />
          ) : null}
          {tab === "compliance" ? (
            <EmptyState
              title="合规词表还是空的"
              description="内容闸要拦竞品贬损、未披露付费、缺 AI 标识和夸大用语。词表随后再补。"
            />
          ) : null}
          {tab === "audit" ? (
            <EmptyState
              title="还没体检"
              description="高危未清时，内容工单不开工。修复后 7 天再查。"
            />
          ) : null}
          {tab === "channels" ? (
            <EmptyState
              title="没有自动投放渠道"
              description="审核通过后你自己发。这里以后只回填 URL。"
            />
          ) : null}
        </LayoutContent>
      }
    />
  );
}
