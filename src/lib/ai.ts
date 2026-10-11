// OpenAI 兼容 chat/completions 客户端（默认 DeepSeek）。
// 浏览器直连：API Key 存于 localStorage（用户已知情），错误信息区分网络/鉴权/限流。

import type { AiConfig, DiaryAnalysis } from '../types';

export type AiErrorKind = 'config' | 'network' | 'auth' | 'rate' | 'server' | 'parse';

export class AiError extends Error {
  constructor(
    public kind: AiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

const CORS_HINT =
  '浏览器直连被拒绝（可能是跨域 CORS 限制或网络不可达）。' +
  'DeepSeek 官方接口支持网页直连；若更换了服务商仍报错，请确认该服务商允许浏览器跨域访问，或改用中转地址。';

function endpointOf(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) throw new AiError('config', '请先填写 API 地址');
  if (/\/chat\/completions$/.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chatCompletion(cfg: AiConfig, messages: ChatMessage[]): Promise<string> {
  if (!cfg.apiKey.trim()) throw new AiError('config', '请先在设置中填写 API Key');
  if (!cfg.model.trim()) throw new AiError('config', '请先在设置中填写模型名称');

  let res: Response;
  try {
    res = await fetch(endpointOf(cfg.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: cfg.model.trim(),
        messages,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        stream: false,
      }),
    });
  } catch {
    throw new AiError('network', CORS_HINT);
  }

  if (res.status === 401 || res.status === 403) {
    throw new AiError('auth', 'API Key 无效或没有权限，请检查后重试。');
  }
  if (res.status === 429) {
    throw new AiError('rate', '请求过于频繁或额度不足，请稍后再试。');
  }
  if (!res.ok) {
    let detail = `服务返回 ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body?.error?.message) detail = body.error.message;
    } catch {
      // 保留状态码信息
    }
    throw new AiError('server', `AI 服务出错：${detail}`);
  }

  let data: { choices?: { message?: { content?: string | null; reasoning_content?: string | null } }[] };
  try {
    data = await res.json();
  } catch {
    throw new AiError('parse', 'AI 服务返回的内容不是 JSON。');
  }
  const choice = data?.choices?.[0]?.message;
  const content = choice?.content ?? choice?.reasoning_content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new AiError('parse', 'AI 没有返回内容，请重试。');
  }
  return content;
}

// ---------------------------------------------------------------------------
// 日记分析

const ANALYSIS_SYSTEM_PROMPT = `你是一位温和、平等、不评判的中文成长教练"同行者"。用户会给你某一天的日记正文。
请阅读日记，分析并只返回一个 JSON 对象，不要输出 markdown 代码块或任何解释文字。JSON 结构如下：
{
  "emotions": ["平静", "期待"],
  "energy": 3,
  "focus": 4,
  "highlight": "今日高光，一句话概括最亮的部分；没有则填空字符串",
  "lowlight": "低谷时刻，一句话；没有则填空字符串",
  "small_win": "今日小胜利，无论多小都值得记录；实在没有则填空字符串",
  "tags": ["工作", "运动"],
  "summary": "一两句温暖的总结，像朋友一样与用户同行，不评判、不说教"
}
字段要求：
- emotions：2~6 个当天的主要情绪词（如"开心""焦虑""平静"）
- energy：1~5 的整数，表示当天精力水平，5 为精力充沛
- focus：1~5 的整数，表示当天专注程度，5 为极度专注
- tags：2~5 个主题标签（如"工作""家庭""健康""学习"）`;

export function buildAnalysisMessages(date: string, content: string): ChatMessage[] {
  return [
    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: `日期：${date}\n\n日记正文：\n${content}` },
  ];
}

function stripJsonEnvelope(raw: string): string {
  let text = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(text);
  if (fenced) text = fenced[1].trim();
  // 有些模型会在 JSON 前后附带说明文字，取第一个 { 到最后一个 } 之间的部分。
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  return text;
}

export type AnalysisPayload = Omit<DiaryAnalysis, 'entry_date' | 'model' | 'created_at'>;

/** 解析并宽容地校验 AI 输出的分析 JSON。 */
export function parseAnalysisJson(raw: string): AnalysisPayload {
  let obj: unknown;
  try {
    obj = JSON.parse(stripJsonEnvelope(raw));
  } catch {
    throw new AiError('parse', 'AI 返回的内容无法解析为分析结果，请重试。');
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new AiError('parse', 'AI 返回的分析结果格式不正确，请重试。');
  }
  const source = obj as Record<string, unknown>;

  const stringArray = (value: unknown, max: number): string[] =>
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim())
          .slice(0, max)
      : [];

  const clampScore = (value: unknown): number => {
    const num = Math.round(Number(value));
    return Number.isFinite(num) ? Math.min(5, Math.max(1, num)) : 3;
  };

  const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

  return {
    emotions: stringArray(source.emotions, 8),
    energy: clampScore(source.energy),
    focus: clampScore(source.focus),
    highlight: asText(source.highlight),
    lowlight: asText(source.lowlight),
    small_win: asText(source.small_win),
    tags: stringArray(source.tags, 6),
    summary: asText(source.summary),
  };
}

export async function analyzeEntry(cfg: AiConfig, date: string, content: string): Promise<DiaryAnalysis> {
  const raw = await chatCompletion(cfg, buildAnalysisMessages(date, content));
  const payload = parseAnalysisJson(raw);
  return {
    entry_date: date,
    ...payload,
    model: cfg.model.trim(),
    created_at: new Date().toISOString(),
  };
}

/** 设置页「测试连接」：返回所用模型名，失败抛 AiError。 */
export async function testConnection(cfg: AiConfig): Promise<string> {
  const raw = await chatCompletion(cfg, [
    { role: 'user', content: '请只返回这个 JSON：{"ok": true}' },
  ]);
  let parsed: { ok?: unknown };
  try {
    parsed = JSON.parse(stripJsonEnvelope(raw)) as { ok?: unknown };
  } catch {
    throw new AiError('parse', '服务有响应，但返回内容无法解析。');
  }
  if (!parsed || parsed.ok !== true) {
    throw new AiError('parse', '服务有响应，但返回内容不符合预期。');
  }
  return cfg.model.trim();
}
