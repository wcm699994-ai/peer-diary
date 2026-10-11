// 首次使用引导：欢迎说明 → 设置 PIN（必填）→ AI 配置（可跳过）。

import { useState } from 'react';
import { BookOpen, ChevronRight, KeyRound, Sparkles } from 'lucide-react';
import { useLockStore } from '../stores/lockStore';
import { useSettingsStore } from '../stores/settingsStore';

const PIN_PATTERN = /^\d{4,8}$/;

export default function Onboarding() {
  const setupPin = useLockStore((state) => state.setupPin);
  const busy = useLockStore((state) => state.busy);
  const error = useLockStore((state) => state.error);
  const { ai, updateAi } = useSettingsStore();

  const [step, setStep] = useState(0);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState(ai.baseUrl);
  const [model, setModel] = useState(ai.model);
  const [apiKey, setApiKey] = useState(ai.apiKey);

  function handlePinNext() {
    if (!PIN_PATTERN.test(pin1)) {
      setPinError('PIN 需为 4~8 位数字');
      return;
    }
    if (pin1 !== pin2) {
      setPinError('两次输入的 PIN 不一致');
      return;
    }
    setPinError(null);
    setStep(2);
  }

  async function handleFinish(withAi: boolean) {
    if (withAi) {
      updateAi({ baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim(), autoAnalyze: true });
    }
    await setupPin(pin1);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-journal-50 px-4 py-10">
      <div className="w-full max-w-sm">
        {step === 0 && (
          <section className="book-card content-reveal p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-book bg-calm-600 text-white shadow-[var(--shadow-card)]">
              <BookOpen size={26} />
            </div>
            <h1 className="text-lg font-semibold text-calm-800">欢迎使用同行日记</h1>
            <ul className="mt-4 space-y-2.5 text-left text-xs leading-5 text-journal-600">
              <li>· 所有日记只保存在这台设备的浏览器里，经过 PIN 加密，服务器不存储任何内容。</li>
              <li>· PIN 是唯一的钥匙：<strong className="text-warm-700">忘记 PIN 将无法找回任何日记</strong>，请牢记。</li>
              <li>· AI 分析需要你自己的 API Key（默认 DeepSeek），不配置也能正常写日记。</li>
            </ul>
            <button type="button" onClick={() => setStep(1)} className="primary-button mt-6 w-full justify-center">
              开始设置
            </button>
          </section>
        )}

        {step === 1 && (
          <section className="book-card content-reveal p-6">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound size={17} className="text-calm-600" />
              <h1 className="text-base font-semibold text-calm-800">设置解锁 PIN</h1>
            </div>
            <label className="block">
              <span className="muted-label">PIN（4~8 位数字）</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={8}
                value={pin1}
                onChange={(event) => setPin1(event.target.value.replace(/\D/g, ''))}
                className="soft-input mt-1 w-full text-lg tracking-[0.4em]"
              />
            </label>
            <label className="mt-3 block">
              <span className="muted-label">再输入一次</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={8}
                value={pin2}
                onChange={(event) => setPin2(event.target.value.replace(/\D/g, ''))}
                className="soft-input mt-1 w-full text-lg tracking-[0.4em]"
              />
            </label>
            <p className="mt-2 min-h-5 text-xs text-warm-700">{pinError ?? error ?? ''}</p>
            <button
              type="button"
              onClick={handlePinNext}
              disabled={pin1.length < 4 || pin2.length < 4}
              className="primary-button mt-2 w-full justify-center"
            >
              下一步
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="book-card content-reveal p-6">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles size={17} className="text-calm-600" />
              <h1 className="text-base font-semibold text-calm-800">AI 分析（可选）</h1>
            </div>
            <p className="mb-4 text-xs leading-5 text-journal-500">
              填入 OpenAI 兼容服务的 Key，保存日记后会自动生成情绪与能量分析。默认 DeepSeek，可随时在设置里修改。
            </p>
            <label className="block">
              <span className="muted-label">API Key</span>
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-…"
                className="soft-input mt-1 w-full"
              />
            </label>
            <label className="mt-3 block">
              <span className="muted-label">API 地址</span>
              <input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                className="soft-input mt-1 w-full"
              />
            </label>
            <label className="mt-3 block">
              <span className="muted-label">模型</span>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="soft-input mt-1 w-full"
              />
            </label>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void handleFinish(false)}
                disabled={busy}
                className="secondary-button flex-1 justify-center"
              >
                跳过
              </button>
              <button
                type="button"
                onClick={() => void handleFinish(true)}
                disabled={busy || !apiKey.trim()}
                className="primary-button flex-1 justify-center"
              >
                {busy ? '创建中…' : '完成设置'}
              </button>
            </div>
            <p className="mt-3 flex items-center gap-1 text-[10px] text-journal-400">
              <ChevronRight size={10} /> API Key 明文保存在本浏览器 localStorage 中
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
