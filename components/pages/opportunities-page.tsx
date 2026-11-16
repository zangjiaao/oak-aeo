"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";

type Cell = { id: string; cluster: string; doubao: string; qwen: string; deepseek: string; kimi: string; gap: string };

const ROWS: Cell[] = [
  {
    id: "price",
    cluster: "按次计费怎么算",
    doubao: "样本不足",
    qwen: "样本不足",
    deepseek: "样本不足",
    kimi: "样本不足",
    gap: "还没采样",
  },
  {
    id: "platform",
    cluster: "能查哪些平台",
    doubao: "样本不足",
    qwen: "样本不足",
    deepseek: "样本不足",
    kimi: "样本不足",
    gap: "事实冲突",
  },
];

const COLUMNS: TableColumn<Cell>[] = [
  { key: "cluster", header: "问句簇", width: proportional(2) },
  { key: "doubao", header: "豆包", width: proportional(1) },
  { key: "qwen", header: "千问", width: proportional(1) },
  { key: "deepseek", header: "DeepSeek", width: proportional(1) },
  { key: "kimi", header: "Kimi", width: proportional(1) },
  {
    key: "gap",
    header: "缺口",
    width: proportional(1),
    renderCell: (row) =>
      row.gap === "事实冲突" ? <Badge variant="warning" label="事实冲突" /> : row.gap,
  },
];

const TILES = [
  { label: "非品牌提及率", value: "—", note: "无基线" },
  { label: "Top3 概率", value: "—", note: "无名次不编码" },
  { label: "可答率", value: "—", note: "池未冻结" },
  { label: "待补事实", value: "1", note: "示意：接口数量冲突" },
];

export function OpportunitiesPage() {
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader>
          <VStack gap={1}>
            <Heading level={1}>机会看板</Heading>
            <Text type="supporting" color="secondary">
              没有基线时不给机会强度。下面的表只说明格子长什么样。
            </Text>
          </VStack>
        </LayoutHeader>
      }
      end={
        <LayoutPanel width={300} padding={4} label="机会详情">
          <VStack gap={2}>
            <Heading level={3}>机会详情</Heading>
            <EmptyState
              title="先跑基线"
              description="选中一格之后，这里放样本列表。现在没有有效样本，不能生成内容工单。"
              actions={<Button label="生成采集清单" variant="secondary" isDisabled />}
            />
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={5}>
            <Grid columns={{ minWidth: 180 }} gap={3}>
              {TILES.map((tile) => (
                <Card key={tile.label} padding={4}>
                  <VStack gap={1}>
                    <Text type="supporting" color="secondary">
                      {tile.label}
                    </Text>
                    <Heading level={2}>{tile.value}</Heading>
                    <Text type="supporting" color="secondary">
                      {tile.note}
                    </Text>
                  </VStack>
                </Card>
              ))}
            </Grid>
            <VStack gap={2}>
              <Heading level={3}>问句簇 × 平台</Heading>
              <Table data={ROWS} columns={COLUMNS} idKey="id" density="compact" />
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
