// PIN 解锁屏：大号数字键盘（移动端友好），支持物理键盘输入。

import { useEffect, useState } from 'react';
import { BookOpen, Delete } from 'lucide-react';
import { useLockStore } from '../stores/lockStore';

const MAX_LEN = 8;

export default function LockScreen() {
  const unlock = useLockStore((state) => state.unlock);
  const busy = useLockStore((state) => state.busy);
  const error = useLockStore((state) => state.error);
  const [pin, setPin] = useState('');

  const press = (digit: string) => {
    if (!busy && pin.length < MAX_LEN) setPin((prev) => prev + digit);
  };
  const back = () => setPin((prev) => prev.slice(0, -1));

  async function submit() {
    if (busy || pin.length < 4) return;
    await unlock(pin);
    setPin('');
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^[0-9]$/.test(event.key)) press(event.key);
      else if (event.key === 'Backspace') back();
      else if (event.key === 'Enter') void submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // pin/busy 变化时重挂以捕获最新闭包
  }, [pin, busy]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-journal-50 px-6 py-10">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-book bg-calm-600 text-white shadow-[var(--shadow-card)]">
          <BookOpen size={26} />
        </div>
        <h1 className="text-lg font-semibold text-calm-800">同行日记</h1>
        <p className="mt-1 text-xs text-journal-500">输入 PIN 解锁 · 数据已在本机加密</p>

        <div
          className={`mt-6 flex justify-center gap-2 ${error ? 'animate-shake' : ''}`}
          aria-label={`已输入 ${pin.length} 位 PIN`}
        >
          {Array.from({ length: MAX_LEN }, (_, index) => (
            <span
              key={index}
              className={`h-2.5 w-2.5 rounded-full ${index < pin.length ? 'bg-calm-600' : 'bg-journal-200'}`}
            />
          ))}
        </div>
        <p className="mt-3 min-h-5 text-xs text-warm-700">{error ?? ''}</p>

        <div className="mt-2 grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button key={digit} type="button" onClick={() => press(digit)} className="key-button">
              {digit}
            </button>
          ))}
          <span aria-hidden />
          <button type="button" onClick={() => press('0')} className="key-button">
            0
          </button>
          <button type="button" onClick={back} className="key-button" aria-label="删除一位">
            <Delete size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={busy || pin.length < 4}
          className="primary-button mt-4 w-full justify-center"
        >
          {busy ? '验证中…' : '解锁'}
        </button>
      </div>
    </main>
  );
}
