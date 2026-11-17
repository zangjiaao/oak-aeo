"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { FileInput } from "@astryxdesign/core/FileInput";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";

const TABS = [
  { value: "facts", label: "事实块" },
  { value: "seeds", label: "词根" },
  { value: "compliance", label: "合规口径" },
  { value: "audit", label: "技术体检" },
  { value: "channels", label: "发布渠道" },
] as const;

type Source = { id: string; kind: "official" | "material"; title: string; url: string | null; sha256: string; capturedAt: string };
type Fact = { id: string; sourceId: string; sourceTitle: string; sourceUrl: string | null; tier: "A" | "B";
  topic: string; statement: string; quote: string; scope: string; boundary: string;
  status: "draft" | "approved" | "rejected" | "conflict"; version: number; decidedBy: string | null; confidence: number | null };
type Version = { version: number; status: string; changedAt: string; decidedBy: string | null };
type FactForm = { topic: string; statement: string; quote: string; scope: string; boundary: string };
const blank: FactForm = { topic: "", statement: "", quote: "", scope: "", boundary: "" };

async function api<T>(url: string, method?: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "请求失败，请重试。");
  return value as T;
}

export function BrandPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("facts");
  const [sources, setSources] = useState<Source[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [form, setForm] = useState<FactForm>(blank);
  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialText, setMaterialText] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [reviewer, setReviewer] = useState("");
  const [modelReady, setModelReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const [sourceResult, factResult] = await Promise.all([
      api<{ sources: Source[]; modelConfigured: boolean }>("/api/sources"),
      api<{ facts: Fact[] }>("/api/facts"),
    ]);
    setSources(sourceResult.sources);
    setFacts(factResult.facts);
    setModelReady(sourceResult.modelConfigured);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      api<{ sources: Source[]; modelConfigured: boolean }>("/api/sources"),
      api<{ facts: Fact[] }>("/api/facts"),
    ]).then(([sourceResult, factResult]) => {
      if (!active) return;
      setSources(sourceResult.sources); setFacts(factResult.facts); setModelReady(sourceResult.modelConfigured);
    }).catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : "加载失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  async function run(operation: () => Promise<string>) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { const message = await operation(); await refresh(); setNotice(message); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "操作失败，请重试。"); }
    finally { setBusy(false); }
  }

  async function chooseSource(source: Source) {
    setError("");
    try {
      const result = await api<{ source: Source; text: string }>(`/api/sources/${source.id}`);
      setSelectedSource(source); setSourceText(result.text); setSelectedFact(null); setVersions([]); setForm(blank);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "无法读取来源快照。"); }
  }

  async function chooseFact(fact: Fact) {
    setSelectedFact(fact);
    setForm({ topic: fact.topic, statement: fact.statement, quote: fact.quote, scope: fact.scope, boundary: fact.boundary });
    const source = sources.find((item) => item.id === fact.sourceId);
    if (source) await chooseSource(source);
    setSelectedFact(fact);
    setForm({ topic: fact.topic, statement: fact.statement, quote: fact.quote, scope: fact.scope, boundary: fact.boundary });
    try { setVersions((await api<{ versions: Version[] }>(`/api/facts?versions=${fact.id}`)).versions); }
    catch { setVersions([]); }
  }

  function field(key: keyof FactForm, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  const sourceColumns: TableColumn<Source>[] = [
    { key: "title", header: "来源", width: proportional(2), renderCell: (row) => row.url || row.title },
    { key: "kind", header: "级别", width: proportional(0.7), renderCell: (row) => row.kind === "official" ? "A · 官网" : "B · 用户材料" },
    { key: "capturedAt", header: "采集时间", width: proportional(1), renderCell: (row) => new Date(row.capturedAt).toLocaleString("zh-CN") },
    { key: "id", header: "操作", width: proportional(0.8), renderCell: (row) => <Button label="查看快照" size="sm" variant="ghost" onClick={() => { void chooseSource(row); }} /> },
  ];
  const factColumns: TableColumn<Fact>[] = [
    { key: "statement", header: "陈述", width: proportional(2.4) },
    { key: "tier", header: "级别", width: proportional(0.5) },
    { key: "status", header: "状态", width: proportional(0.8), renderCell: (row) => row.status === "approved" ? "已生效" : row.status === "draft" ? "草稿" : row.status === "conflict" ? "冲突待裁决" : "已拒绝" },
    { key: "version", header: "版本", width: proportional(0.5) },
    { key: "id", header: "操作", width: proportional(0.8), renderCell: (row) => <Button label="查看与审核" size="sm" variant="ghost" onClick={() => { void chooseFact(row); }} /> },
  ];

  return (
    <Layout
      height="fill"
      header={<LayoutHeader><VStack gap={3}>
        <VStack gap={1}>
          <Heading level={1}>品牌设置</Heading>
          <Text type="supporting" color="secondary">事实要能对回原文快照。A 级官网事实经人工审核后生效；B 级用户材料只作内部参考。</Text>
        </VStack>
        <TabList value={tab} onChange={setTab} aria-label="品牌分区">
          {TABS.map((item) => <Tab key={item.value} value={item.value} label={item.label} />)}
        </TabList>
      </VStack></LayoutHeader>}
      content={<LayoutContent padding={6}>
        {tab === "facts" ? <VStack gap={5}>
          {loading ? <Text type="body">正在加载来源与事实…</Text> : null}
          {error ? <Text type="body" role="alert">{error}</Text> : null}
          {notice ? <Text type="body" role="status">{notice}</Text> : null}
          <VStack gap={2}>
            <Heading level={2}>采集官网来源</Heading>
            <Text type="supporting" color="secondary">只抓取 okdata.online 的 HTTPS 页面。采集时保存原文与正文快照；{modelReady ? "已配置 Agent，会尝试生成事实候选。" : "模型未配置，可先人工建立草稿。"}</Text>
            <HStack gap={2} vAlign="end">
              <TextInput label="官网链接" value={url} onChange={setUrl} placeholder="https://okdata.online/llms.txt" width="100%" />
              <Button label="采集并生成候选" variant="primary" isLoading={busy} isDisabled={!url.trim()} onClick={() => { void run(async () => {
                const result = await api<{ source: Source; message: string }>("/api/sources", "POST", { kind: "official", url });
                setUrl(""); await chooseSource(result.source); return result.message;
              }); }} />
            </HStack>
          </VStack>
          <VStack gap={2}>
            <Heading level={3}>或粘贴用户材料</Heading>
            <TextInput label="材料标题" value={materialTitle} onChange={setMaterialTitle} placeholder="如产品说明文档" width="100%" />
            <FileInput label="选择 TXT 或 Markdown 文件" value={materialFile} accept=".txt,.md,.markdown,text/plain,text/markdown" maxSize={50_000} mode="dropzone"
              description="可拖入文本文件，读取后请核对正文，再保存为 B 级来源。"
              onChange={(file) => { const selected = file instanceof File ? file : null; setMaterialFile(selected);
                if (selected) void selected.text().then((text) => { setMaterialTitle(selected.name); setMaterialText(text); }); }} />
            <TextArea label="材料正文" value={materialText} onChange={setMaterialText} rows={4} placeholder="粘贴可公开核对的原文，不要粘贴密钥或敏感信息。" />
            <Button label="保存 B 级来源" variant="secondary" isLoading={busy} isDisabled={!materialTitle.trim() || materialText.trim().length < 20} onClick={() => { void run(async () => {
              const result = await api<{ source: Source; message: string }>("/api/sources", "POST", { kind: "material", title: materialTitle, text: materialText });
              setMaterialTitle(""); setMaterialText(""); setMaterialFile(null); await chooseSource(result.source); return result.message;
            }); }} />
          </VStack>
          <VStack gap={2}>
            <Heading level={2}>来源快照</Heading>
            {sources.length ? <Table data={sources} columns={sourceColumns} idKey="id" density="compact" /> : <EmptyState title="还没有来源" description="先采集一份官网文档，或粘贴用户材料。" />}
            {selectedSource ? <VStack gap={2}>
              <HStack gap={2} vAlign="center"><Heading level={3}>{selectedSource.title}</Heading><Badge variant="neutral" label={selectedSource.kind === "official" ? "A 级" : "B 级"} /></HStack>
              <Text type="supporting" color="secondary">来源 ID：{selectedSource.id} · SHA-256：{selectedSource.sha256}</Text>
              <TextArea label="快照正文（只读，可复制引文）" value={sourceText} onChange={() => {}} isReadOnly rows={8} />
            </VStack> : null}
          </VStack>
          {selectedSource ? <VStack gap={2}>
            <Heading level={2}>{selectedFact ? "修改与审核事实" : "根据快照建立事实草稿"}</Heading>
            <Text type="supporting" color="secondary">引文须是快照中的连续原文；陈述里的数字须逐字出现在引文中。主题相同的生效事实需要人工裁决。</Text>
            <TextInput label="主题键" value={form.topic} onChange={(value) => field("topic", value)} placeholder="例如：接口数量" width="100%" />
            <TextArea label="一句事实陈述" value={form.statement} onChange={(value) => field("statement", value)} rows={2} />
            <TextArea label="原文引文" value={form.quote} onChange={(value) => field("quote", value)} rows={3} />
            <TextInput label="适用口径" value={form.scope} onChange={(value) => field("scope", value)} placeholder="例如：官网当前公开接口" width="100%" />
            <TextInput label="边界" value={form.boundary} onChange={(value) => field("boundary", value)} placeholder="例如：以文档更新时间为准" width="100%" />
            <HStack gap={2}>
              <Button label={selectedFact ? "保存新版本草稿" : "保存事实草稿"} variant="secondary" isLoading={busy} isDisabled={!Object.values(form).every((value) => value.trim()) || selectedFact?.status === "approved"} onClick={() => { void run(async () => {
                if (selectedFact) await api("/api/facts", "PATCH", { id: selectedFact.id, action: "edit", input: { ...form, sourceId: selectedFact.sourceId } });
                else await api("/api/facts", "POST", { ...form, sourceId: selectedSource.id });
                setSelectedFact(null); setForm(blank); return "事实草稿已保存，尚未生效。";
              }); }} />
              {selectedFact ? <Button label="新建另一条候选" variant="ghost" onClick={() => { setSelectedFact(null); setForm(blank); setVersions([]); }} /> : null}
            </HStack>
            {selectedFact ? <VStack gap={2}>
              <TextInput label="审核 / 裁决人" value={reviewer} onChange={setReviewer} placeholder="请填写你的姓名" width="100%" />
              <HStack gap={2} wrap="wrap">
                <Button label="审核生效" variant="primary" isDisabled={busy || selectedFact.tier !== "A" || !reviewer.trim() || selectedFact.status === "approved"} onClick={() => { void run(async () => {
                  await api("/api/facts", "PATCH", { id: selectedFact.id, action: "approve", reviewer });
                  setSelectedFact(null); return "A 级事实已审核生效。";
                }); }} />
                <Button label="裁决为生效" variant="secondary" isDisabled={busy || selectedFact.tier !== "A" || !reviewer.trim()} onClick={() => { void run(async () => {
                  await api("/api/facts", "PATCH", { id: selectedFact.id, action: "resolve", reviewer });
                  setSelectedFact(null); return "已将本条设为生效，同主题旧事实保留为冲突记录。";
                }); }} />
                <Button label="拒绝候选" variant="ghost" isDisabled={busy || !reviewer.trim()} onClick={() => { void run(async () => {
                  await api("/api/facts", "PATCH", { id: selectedFact.id, action: "reject", reviewer });
                  setSelectedFact(null); return "候选已拒绝，历史保留。";
                }); }} />
              </HStack>
              <Text type="supporting" color="secondary">当前：{selectedFact.status} · v{selectedFact.version} · 裁决人：{selectedFact.decidedBy || "未裁决"}</Text>
              {versions.length > 1 ? <VStack gap={1}>
                <Heading level={3}>历史版本</Heading>
                {versions.slice(1).map((version) => <HStack key={version.version} gap={2} vAlign="center">
                  <Text type="body">v{version.version} · {version.status} · {version.decidedBy || "草稿"}</Text>
                  <Button label={`回退到 v${version.version}`} size="sm" variant="ghost" isDisabled={busy || !reviewer.trim()} onClick={() => { void run(async () => {
                    await api("/api/facts", "PATCH", { id: selectedFact.id, action: "rollback", version: version.version, reviewer });
                    setSelectedFact(null); return `已回退到 v${version.version} 的内容，并生成新版本。`;
                  }); }} />
                </HStack>)}
              </VStack> : null}
            </VStack> : null}
          </VStack> : null}
          <VStack gap={2}>
            <Heading level={2}>事实块库</Heading>
            {facts.length ? <Table data={facts} columns={factColumns} idKey="id" density="compact" /> : <EmptyState title="事实块库还没有草稿" description="先选择来源快照，复制一段原文引文，再填写可核验的一句话。" />}
          </VStack>
        </VStack> : null}
        {tab === "seeds" ? <EmptyState title="词根还没生成" description="事实块审核后，再从事实出发建立买家译法。" /> : null}
        {tab === "compliance" ? <EmptyState title="合规词表还是空的" description="内容闸将在内容功能中接入。" /> : null}
        {tab === "audit" ? <EmptyState title="还没体检" description="技术体检将在事实和问句确认后接入。" /> : null}
        {tab === "channels" ? <EmptyState title="没有自动投放渠道" description="审核通过后人工发布，后续回填 URL。" /> : null}
      </LayoutContent>}
    />
  );
}
