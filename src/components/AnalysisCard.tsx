// AI 分析卡：把 AI 生成的指标可视化——总结气泡、能量/专注仪表、情绪彩色标签、
// 高光/低谷/小胜利三卡、主题标签。

import { CloudRain, RefreshCw, Settings, Sparkles, Sun, Trophy, Wand2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { useUiStore } from '../stores/uiStore';

const POSITIVE_WORDS = ['开心', '快乐', '高兴', '兴奋', '期待', '满足', '感恩', '平静', '放松', '安心', '幸福', '自豪', '喜悦', '踏实', '轻松', '希望', '温暖', '治愈', '愉快', '欣慰'];
const NEGATIVE_WORDS = ['焦虑', '愤怒', '生气', '难过', '悲伤', '疲惫', '累', '沮丧', '恐惧', '害怕', '羞愧', '内疚', '委屈', '孤独', '烦躁', '压力', '无力', '迷茫', '失望', '烦', '紧张', '低落'];

function toneOf(tag: string): 'pos' | 'neg' | 'neutral' {
  if (POSITIVE_WORDS.some((word) => tag.includes(word))) return 'pos';
  if (NEGATIVE_WORDS.some((word) => tag.includes(word))) return 'neg';
  return 'neutral';
}

export function EmotionChip({ tag, small }: { tag: string; small?: boolean }) {
  const tone = toneOf(tag);
  const toneClass =
    tone === 'pos'
      ? 'bg-calm-100 text-calm-700 border-calm-200'
      : tone === 'neg'
        ? 'bg-warm-100 text-warm-800 border-warm-200'
        : 'bg-journal-100 text-calm-700 border-journal-200';
  return (
    <span
      className={`inline-flex items-center rounded-full border ${toneClass} ${
        small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {tag}
    </span>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: 'energy' | 'focus' }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="muted-label">{label}</span>
        <span className="font-medium text-calm-700">{value} / 5</span>
      </div>
      <div className="flex gap-1" role="img" aria-label={`${label} ${value} 分，满分 5 分`}>
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index < value ? (tone === 'energy' ? 'bg-calm-500' : 'bg-warm-400') : 'bg-journal-100'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function MiniCard({
  icon,
  title,
  text,
  tone,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  tone: 'pos' | 'neg' | 'gold';
}) {
  if (!text.trim()) return null;
  const toneClass =
    tone === 'pos'
      ? 'bg-calm-50/80 border-calm-200/70 text-calm-600'
      : tone === 'neg'
        ? 'bg-warm-50/80 border-warm-200/70 text-warm-500'
        : 'bg-journal-50/80 border-journal-200/70 text-journal-500';
  return (
    <div className={`rounded-book border p-2.5 ${toneClass}`}>
      <p className="flex items-center gap-1 text-[11px] font-medium">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-calm-800">{text}</p>
    </div>
  );
}

export default function AnalysisCard() {
  const analysis = useDiaryStore((state) => state.analysis);
  const status = useDiaryStore((state) => state.analysisStatus);
  const analysisError = useDiaryStore((state) => state.analysisError);
  const entry = useDiaryStore((state) => state.entry);
  const runAnalysis = useDiaryStore((state) => state.runAnalysis);
  const setTab = useUiStore((state) => state.setTab);

  if (!entry) return null;

  return (
    <section className="book-card p-4 sm:p-5" aria-label="AI 分析">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title flex items-center gap-1.5">
          <Sparkles size={15} className="text-calm-500" />
          AI 同行者
        </h2>
        {status === 'done' && (
          <button
            type="button"
            onClick={() => void runAnalysis()}
            className="icon-button h-8 w-8 text-calm-500"
            aria-label="重新分析"
            title="重新分析"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {status === 'running' && (
        <div className="space-y-3">
          <p className="text-xs text-journal-500">AI 正在阅读这篇日记…</p>
          <div className="space-y-2">
            <div className="skeleton-shimmer h-4 w-3/4 rounded bg-journal-100" />
            <div className="skeleton-shimmer h-4 w-1/2 rounded bg-journal-100" />
            <div className="skeleton-shimmer h-4 w-2/3 rounded bg-journal-100" />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div>
          <p className="text-xs leading-5 text-warm-700">{analysisError}</p>
          <button type="button" onClick={() => void runAnalysis()} className="secondary-button mt-3 text-xs">
            <RefreshCw size={13} /> 重试
          </button>
        </div>
      )}

      {status === 'missing-config' && (
        <div>
          <p className="text-xs leading-5 text-journal-600">
            配置 AI 之后，这里会自动生成情绪、能量与总结。
          </p>
          <button type="button" onClick={() => setTab('settings')} className="secondary-button mt-3 text-xs">
            <Settings size={13} /> 去设置
          </button>
        </div>
      )}

      {status === 'idle' && (
        <div>
          <p className="text-xs text-journal-500">让 AI 陪你回顾这一天。</p>
          <button type="button" onClick={() => void runAnalysis()} className="secondary-button mt-3 text-xs">
            <Wand2 size={13} /> 生成分析
          </button>
        </div>
      )}

      {status === 'done' && analysis && (
        <div className="space-y-4">
          {analysis.summary && (
            <p className="rounded-book border border-calm-200/70 bg-calm-50/70 px-3 py-2.5 text-sm leading-6 text-calm-800">
              {analysis.summary}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Meter label="能量" value={analysis.energy} tone="energy" />
            <Meter label="专注" value={analysis.focus} tone="focus" />
          </div>
          {analysis.emotions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {analysis.emotions.map((tag) => (
                <EmotionChip key={tag} tag={tag} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <MiniCard icon={<Sun size={13} />} title="高光" text={analysis.highlight} tone="pos" />
            <MiniCard icon={<CloudRain size={13} />} title="低谷" text={analysis.lowlight} tone="neg" />
            <MiniCard icon={<Trophy size={13} />} title="小胜利" text={analysis.small_win} tone="gold" />
          </div>
          {analysis.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {analysis.tags.map((tag) => (
                <span key={tag} className="tag-chip !min-h-0 px-2.5 py-0.5 text-[11px]">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-journal-400">由 {analysis.model} 分析生成 · 仅供参照</p>
        </div>
      )}
    </section>
  );
}
