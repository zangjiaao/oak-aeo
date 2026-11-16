"use client";

import { useState } from "react";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Layout, LayoutContent, LayoutHeader, VStack, HStack } from "@astryxdesign/core/Layout";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";

type PlatformRow = {
  id: string;
  platform: string;
  n: string;
  rate: string;
  interval: string;
  note: string;
};

const ROWS: PlatformRow[] = [
  { id: "doubao", platform: "豆包", n: "0", rate: "—", interval: "—", note: "今日剩余 5 次" },
  { id: "qwen", platform: "千问", n: "0", rate: "—", interval: "—", note: "今日剩余 5 次" },
  { id: "deepseek", platform: "DeepSeek", n: "0", rate: "—", interval: "—", note: "今日剩余 5 次" },
  { id: "kimi", platform: "Kimi", n: "0", rate: "—", interval: "—", note: "今日剩余 5 次" },
];

const COLUMNS: TableColumn<PlatformRow>[] = [
  { key: "platform", header: "平台", width: proportional(1.2) },
  { key: "n", header: "有效样本", width: proportional(1) },
  { key: "rate", header: "提及率", width: proportional(1) },
  { key: "interval", header: "Wilson 95%", width: proportional(1) },
  { key: "note", header: "备注", width: proportional(1.4) },
];

const TABS = [
  { value: "baseline", label: "基线" },
  { value: "retest", label: "复测" },
  { value: "trend", label: "趋势" },
  { value: "cause", label: "归因" },
] as const;

export function DiagnosisPage() {
  const [tab, setTab] = useState("baseline");

  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader>
          <VStack gap={3}>
            <VStack gap={1}>
              <Heading level={1}>诊断分析</Heading>
              <Text type="supporting" color="secondary">
                检验以问句为单位。样本不足只报区间，不写显著。MVP 不做跨版本校准。
              </Text>
            </VStack>
            <TabList value={tab} onChange={setTab} aria-label="诊断视图">
              {TABS.map((item) => (
                <Tab key={item.value} value={item.value} label={item.label} />
              ))}
            </TabList>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={4}>
            <HStack gap={4}>
              <Text type="supporting" color="secondary">
                池版本：未冻结
              </Text>
              <Text type="supporting" color="secondary">
                轮换：不适用
              </Text>
              <Text type="supporting" color="secondary">
                通道：web · 人工
              </Text>
              <Text type="supporting" color="secondary">
                算法版本：未发布
              </Text>
            </HStack>
            {tab === "cause" ? (
              <EmptyState
                title="还没有波动需要归因"
                description="以后只允许落到未被抓取、未被召回、被召回未被采用。证据不够就标未解释。"
              />
            ) : (
              <Table data={ROWS} columns={COLUMNS} idKey="id" density="compact" />
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
