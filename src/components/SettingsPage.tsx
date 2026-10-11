// 设置页：AI 配置、导出/备份（见 DataExport）、修改 PIN、关于。

import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { testConnection } from '../lib/ai';
import { estimateStorage } from '../lib/db';
import { DEFAULT_AI, useSettingsStore } from '../stores/settingsStore';
import { useLockStore } from '../stores/lockStore';
import { toast } from '../stores/toastStore';
import { Section } from './ui';
import DataExport from './DataExport';

const PIN_PATTERN = /^\d{4,8}$/;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AiSection() {
  const ai = useSettingsStore((state) => state.ai);
  const updateAi = useSettingsStore((state) => state.updateAi);
  const resetAi = useSettingsStore((state) => state.resetAi);

  const [baseUrl, setBaseUrl] = useState(ai.baseUrl);
  const [model, setModel] = useState(ai.model);
  const [apiKey, setApiKey] = useState(ai.apiKey);
  const [autoAnalyze, setAutoAnalyze] = useState(ai.autoAnalyze);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  function save() {
    updateAi({ baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim(), autoAnalyze });
    toast('AI 设置已保存', 'success');
  }

  function reset() {
    resetAi();
    setBaseUrl(DEFAULT_AI.baseUrl);
    setModel(DEFAULT_AI.model);
    setApiKey(DEFAULT_AI.apiKey);
    setAutoAnalyze(DEFAULT_AI.autoAnalyze);
    setTestResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const usedModel = await testConnection({
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        apiKey: apiKey.trim(),
        autoAnalyze,
      });
      setTestResult(`连接成功（${usedModel}）`);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : '连接失败');
    } finally {
      setTesting(false);
    }
  }

  return (
    <Section
      title="AI 分析"
      description="默认使用 DeepSeek（OpenAI 兼容格式均可）；API Key 只保存在本浏览器，仅用于直连 AI 服务。"
    >
      <div className="space-y-3">
        <label className="block">
          <span className="muted-label">API 地址</span>
          <input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            className="soft-input mt-1 w-full"
            placeholder="https://api.deepseek.com/v1"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="muted-label">模型</span>
          <input
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="soft-input mt-1 w-full"
            placeholder="deepseek-chat"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="muted-label">API Key</span>
          <div className="relative mt-1">
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              type={showKey ? 'text' : 'password'}
              className="soft-input w-full pr-11"
              placeholder="sk-…"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              className="icon-button absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-journal-400"
              aria-label={showKey ? '隐藏 Key' : '显示 Key'}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>
        <label className="flex items-center gap-2 text-sm text-calm-700">
          <input
            type="checkbox"
            checked={autoAnalyze}
            onChange={(event) => setAutoAnalyze(event.target.checked)}
            className="h-4 w-4 accent-calm-600"
          />
          保存日记后自动请求 AI 分析
        </label>
        {testResult && (
          <p className={`text-xs leading-5 ${testResult.startsWith('连接成功') ? 'text-calm-700' : 'text-warm-700'}`}>
            {testResult}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="primary-button text-xs">
            保存设置
          </button>
          <button type="button" onClick={handleTest} disabled={testing} className="secondary-button text-xs">
            {testing ? '测试中…' : '测试连接'}
          </button>
          <button type="button" onClick={reset} className="secondary-button text-xs">
            恢复默认
          </button>
        </div>
      </div>
    </Section>
  );
}

function PinSection() {
  const changePin = useLockStore((state) => state.changePin);
  const busy = useLockStore((state) => state.busy);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleChange() {
    setError(null);
    if (!PIN_PATTERN.test(newPin)) {
      setError('新 PIN 需为 4~8 位数字');
      return;
    }
    if (newPin !== confirmPin) {
      setError('两次输入的新 PIN 不一致');
      return;
    }
    try {
      await changePin(oldPin, newPin);
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      toast('PIN 已修改', 'success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '修改失败，请稍后重试。');
    }
  }

  return (
    <Section title="修改 PIN" description="PIN 用于加密本机数据；忘记 PIN 将无法恢复任何日记，请牢记。">
      <div className="space-y-3">
        <label className="block">
          <span className="muted-label">当前 PIN</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={oldPin}
            onChange={(event) => setOldPin(event.target.value.replace(/\D/g, ''))}
            className="soft-input mt-1 w-full tracking-[0.4em]"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="muted-label">新 PIN（4~8 位数字）</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={newPin}
            onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))}
            className="soft-input mt-1 w-full tracking-[0.4em]"
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="muted-label">再输入一次新 PIN</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
            className="soft-input mt-1 w-full tracking-[0.4em]"
            autoComplete="off"
          />
        </label>
        {error && <p className="text-xs text-warm-700">{error}</p>}
        <button
          type="button"
          onClick={handleChange}
          disabled={busy || !oldPin || !newPin}
          className="primary-button text-xs"
        >
          <KeyRound size={13} />
          {busy ? '处理中…' : '修改 PIN'}
        </button>
      </div>
    </Section>
  );
}

function AboutSection() {
  const [usage, setUsage] = useState<number | null>(null);

  useEffect(() => {
    void estimateStorage().then(setUsage);
  }, []);

  return (
    <Section title="关于" description="同行日记 Web 版 v1.0.0">
      <ul className="space-y-1.5 text-xs leading-5 text-journal-600">
        <li>· 所有数据加密保存在这台设备的浏览器里，静态托管服务器不存储任何内容。</li>
        <li>· 换设备时，请先用「备份 / 迁移」导出 JSON，再在新设备导入。</li>
        <li>· 情绪、能量等分析指标由 AI 生成，仅供参照。</li>
        {usage !== null && <li>· 当前数据占用约 {formatBytes(usage)}</li>}
      </ul>
    </Section>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-4 pb-6">
      <AiSection />
      <DataExport />
      <PinSection />
      <AboutSection />
    </div>
  );
}
