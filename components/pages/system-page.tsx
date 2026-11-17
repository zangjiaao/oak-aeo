"use client";

import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";

type ModelStatus = { configured: boolean; model: string | null; endpoint: string | null; missing: string[] };
type QuotaRow = { id: string; platform: string; cap: string; status: string; channel: string };
const QUOTA: QuotaRow[] = [
  { id: "doubao", platform: "豆包", cap: "5", status: "未接入采样", channel: "web · 人工" },
  { id: "qwen", platform: "千问", cap: "5", status: "未接入采样", channel: "web · 人工" },
  { id: "deepseek", platform: "DeepSeek", cap: "5", status: "未接入采样", channel: "web · 人工" },
  { id: "kimi", platform: "Kimi", cap: "5", status: "未接入采样", channel: "web · 人工" },
];
const COLUMNS: TableColumn<QuotaRow>[] = [
  { key: "platform", header: "模型", width: proportional(1.2) },
  { key: "cap", header: "计划每日上限", width: proportional(1) },
  { key: "status", header: "当前状态", width: proportional(1) },
  { key: "channel", header: "计划通道", width: proportional(1.4) },
];

export function SystemPage() {
  const [model, setModel] = useState<ModelStatus | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/model", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("无法读取模型配置状态。"); return response.json() as Promise<ModelStatus>; })
      .then(setModel)
      .catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "读取失败。"); });
    return () => controller.abort();
  }, []);
  async function testModel() {
    setTesting(true); setError(""); setResult("");
    try {
      const response = await fetch("/api/model", { method: "POST", signal: AbortSignal.timeout(60000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "模型测试失败。");
      setResult(`连接成功：${data.model}，耗时 ${data.latencyMs} ms。`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "模型测试失败。"); }
    finally { setTesting(false); }
  }
  return <Layout height="fill"
    header={<LayoutHeader><VStack gap={1}>
      <Heading level={1}>系统设置</Heading>
      <Text type="supporting" color="secondary">单用户本地工作台。模型密钥由服务端环境变量读取。</Text>
    </VStack></LayoutHeader>}
    content={<LayoutContent padding={6}><VStack gap={5}>
      <VStack gap={2}>
        <Heading level={2}>Pi Agent 模型</Heading>
        <Text type="body">用于会话自动回复与官网来源的事实抽取。配置后发送普通消息即可对话。</Text>
        {model ? <VStack gap={1}>
          <Text type="body">状态：{model.configured ? "已配置" : "未配置"}</Text>
          <Text type="supporting" color="secondary">模型：{model.model || "未设置"} · 接口域名：{model.endpoint || "未设置"}</Text>
          {model.missing.length ? <Text type="supporting">待配置：{model.missing.join("、")}</Text> : null}
        </VStack> : <Text type="supporting">正在读取模型状态…</Text>}
        <Text type="supporting" color="secondary">复制项目根目录的 `.env.example` 为 `.env.local`，填写 GEO_MODEL_BASE_URL、GEO_MODEL_ID、GEO_MODEL_API_KEY，重启开发服务。本页不显示密钥。</Text>
        <HStack gap={2}><Button label="测试模型连接" variant="primary" isDisabled={!model?.configured} isLoading={testing} onClick={() => { void testModel(); }} /></HStack>
        {error ? <Text type="body" role="alert">{error}</Text> : null}
        {result ? <Text type="body" role="status">{result}</Text> : null}
      </VStack>
      <VStack gap={2}>
        <Heading level={2}>人工采样配额</Heading>
        <Text type="supporting" color="secondary">采样功能尚未接入。下表是已定上限，不代表已开始记账或拦截。</Text>
        <Table data={QUOTA} columns={COLUMNS} idKey="id" density="compact" />
      </VStack>
      <EmptyState title="池版本和审计日志还没接入" description="完成事实确认后，下一步建立词根与问句池。" />
    </VStack></LayoutContent>}
  />;
}
