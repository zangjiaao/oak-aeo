"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { ChatComposer, ChatLayout, ChatMessage, ChatMessageBubble, ChatMessageList, ChatMessageMetadata } from "@astryxdesign/core/Chat";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { CONVERSATION_ID, MAX_MESSAGE_LENGTH, isSendMessage, officialLink, type ConversationHistory, type SendMessage } from "@/lib/conversation";

const DRAFT_KEY = `${CONVERSATION_ID}:draft:v1`;

function newMessageId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID is unavailable on some HTTP development hosts; getRandomValues remains available.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function readResponse(response: Response): Promise<ConversationHistory> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "请求失败，请重试。");
  return body;
}

export function Conversation() {
  const [history, setHistory] = useState<ConversationHistory | null>(null);
  const [draft, setDraft] = useState<SendMessage>({ id: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replying, setReplying] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const locked = useRef(false);
  const sendRevision = useRef(0);

  function persist(next: SendMessage) {
    try {
      if (next.text) localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      setStorageWarning("浏览器无法保留未发送草稿，离开页面前请复制输入内容。");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/model", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((status: { configured: boolean }) => { if (!controller.signal.aborted) setModelReady(status.configured); })
      .catch(() => { if (!controller.signal.aborted) setModelReady(false); });
    const revision = sendRevision.current;
    async function restore() {
      let local: SendMessage | null = null;
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const value: unknown = JSON.parse(saved);
          if (value && typeof value === "object" && "text" in value && typeof value.text === "string" &&
            "id" in value && typeof value.id === "string") {
            local = { id: value.id, text: value.text };
            setDraft(local);
          }
        }
      } catch {
        setStorageWarning("浏览器草稿无法恢复，请重新输入或粘贴备份。");
      }
      try {
        const restored = await readResponse(await fetch("/api/conversation", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }));
        if (controller.signal.aborted) return;
        if (revision !== sendRevision.current) return;
        setHistory(restored);
        // A previous request may have committed even if its response was lost.
        if (local && restored.messages.some((message) => message.id === local.id && message.text === local.text.trim())) {
          setDraft({ id: "", text: "" });
          persist({ id: "", text: "" });
        }
      } catch (failure) {
        if (!controller.signal.aborted && revision === sendRevision.current) {
          setError(failure instanceof Error ? failure.message : "无法加载会话，请检查网络后重试。");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void restore();
    return () => controller.abort();
  }, []);

  async function reload() {
    if (locked.current) return;
    locked.current = true;
    setLoading(true);
    setError("");
    try {
      setHistory(await readResponse(await fetch("/api/conversation", { cache: "no-store", signal: AbortSignal.timeout(15000) })));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "无法加载会话，请重试。");
    } finally {
      locked.current = false;
      setLoading(false);
    }
  }

  function changeDraft(text: string) {
    if (locked.current) return;
    const next = { id: newMessageId(), text };
    setDraft(next);
    persist(next);
  }

  async function send() {
    if (locked.current || !isSendMessage(draft)) return;
    locked.current = true;
    sendRevision.current += 1;
    setSending(true);
    setError("");
    persist(draft);
    try {
      const saved = await readResponse(await fetch("/api/conversation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft), signal: AbortSignal.timeout(15000),
      }));
      setHistory(saved);
      setLoading(false);
      setDraft({ id: "", text: "" });
      persist({ id: "", text: "" });
      setSending(false);
      await requestReply(draft.id);
    } catch (failure) {
      setError(`${failure instanceof Error ? failure.message : "发送失败，请检查网络。"} 输入已保留，可重新发送。`);
    } finally {
      locked.current = false;
      setSending(false);
    }
  }

  async function requestReply(messageId: string) {
    setReplying(messageId);
    try {
      const updated = await readResponse(await fetch("/api/agent/respond", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }), signal: AbortSignal.timeout(70000),
      }));
      setHistory(updated);
      setError("");
    } catch (failure) {
      setError(`${failure instanceof Error ? failure.message : "Agent 回复失败。"} 消息已保存，可点击「让 Agent 回复」重试。`);
    } finally {
      setReplying(null);
    }
  }

  async function retryReply(messageId: string) {
    if (locked.current || replying) return;
    locked.current = true;
    setError("");
    try { await requestReply(messageId); }
    finally { locked.current = false; }
  }

  async function analyze(messageId: string) {
    if (analyzing) return;
    setAnalyzing(messageId);
    setError("");
    try {
      const updated = await readResponse(await fetch("/api/agent/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }), signal: AbortSignal.timeout(70000),
      }));
      setHistory(updated);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "官网分析失败，请重试。");
    } finally {
      setAnalyzing(null);
    }
  }

  const tooLong = draft.text.length > MAX_MESSAGE_LENGTH;
  return (
    <ChatLayout
      style={{ height: "100%", minHeight: 0 }}
      composer={
        <ChatComposer
          value={draft.text}
          onChange={changeDraft}
          onSubmit={() => { void send(); }}
          placeholder="描述产品或粘贴官网链接。"
          input={
            <TextArea
              label="消息内容"
              isLabelHidden
              value={draft.text}
              onChange={changeDraft}
              placeholder="描述产品或粘贴官网链接。"
              rows={3}
              isReadOnly={sending || Boolean(replying)}
              enterKeyHint="send"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
          }
          sendButton={<Button label="发送消息" variant="primary" isLoading={sending} isDisabled={!draft.text.trim() || tooLong || Boolean(replying)} onClick={() => { void send(); }} />}
          status={error || tooLong || storageWarning ? { type: "error", message: error || (tooLong ? "每条最多 8000 字符，请分段发送。" : storageWarning) } : undefined}
          footerActions={
            <Text type="supporting" color="secondary">
              {sending ? "正在保存…" : replying ? "Pi Agent 正在回复…" : modelReady === false ? "Pi Agent 未配置；消息会保存，请到系统设置配置 DeepSeek。" : "发送后 Pi Agent 会回复；官网来源可单独采集并审核。"}
            </Text>
          }
        />
      }
    >
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center">
          <Text type="supporting" color="secondary" role="status" aria-live="polite">
            {loading ? "正在加载会话…" : history ? "引导 · okdata · 会话已保存" : "会话未加载，可先输入草稿，再重试加载。"}
          </Text>
          <Button label="刷新会话" size="sm" variant="ghost" isDisabled={loading || sending} onClick={() => { void reload(); }} />
          {modelReady === false ? <Button label="配置 DeepSeek 模型" size="sm" variant="ghost" href="/work/system" /> : null}
        </HStack>
        <ChatMessageList>
          {history?.messages.map((message) => (
            <ChatMessage key={message.id} sender={message.role} avatar={message.role === "assistant" ? <Avatar name="Agent" size="md" /> : undefined}>
              <ChatMessageBubble variant={message.role === "assistant" ? "ghost" : "filled"}>
                <Text type="body" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.text}</Text>
                {message.role === "user" && officialLink(message.text) ? (
                  <HStack gap={2}>
                    {!history.messages.some((reply) => reply.id === `fact-analysis-${message.id}`) ?
                      <Button label="请 Agent 分析官网链接" size="sm" variant="primary"
                        isLoading={analyzing === message.id} isDisabled={Boolean(analyzing || replying)}
                        onClick={() => { void analyze(message.id); }} /> : null}
                    <Button label="前往品牌设置" size="sm" variant="ghost"
                      href={`/work/brand?url=${encodeURIComponent(officialLink(message.text)!)}`} />
                  </HStack>
                ) : null}
                {message.role === "user" && !history.messages.some((reply) => reply.id === `agent-reply-${message.id}`) ?
                  <Button label="让 Agent 回复" size="sm" variant="ghost" isLoading={replying === message.id}
                    isDisabled={Boolean(replying || analyzing) || sending} onClick={() => { void retryReply(message.id); }} /> : null}
                {message.id.startsWith("fact-analysis-") ?
                  <Button label="查看来源与事实" size="sm" variant="ghost" href="/work/brand" /> : null}
              </ChatMessageBubble>
              <ChatMessageMetadata
                timestamp={<Timestamp value={message.createdAt} format="time" />}
                footer={message.role === "user" ?
                  history.messages.some((reply) => reply.id === `agent-reply-${message.id}`) ? "已保存 · Agent 已回复" :
                    history.messages.some((reply) => reply.id === `fact-analysis-${message.id}`) ? "已保存 · 官网分析完成 · 待 Agent 回复" :
                    replying === message.id ? "已保存 · Agent 正在回复" :
                      modelReady === false ? "已保存 · 等待模型配置" : "已保存 · 待 Agent 回复" : undefined}
              />
            </ChatMessage>
          ))}
        </ChatMessageList>
      </VStack>
    </ChatLayout>
  );
}
