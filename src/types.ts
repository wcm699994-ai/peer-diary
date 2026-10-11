// 全局类型定义

export interface DiaryEntry {
  entry_date: string; // YYYY-MM-DD，每天一篇
  content: string;
  created_at: string;
  updated_at: string;
}

/** AI 生成的分析结果（全部字段由 AI 输出，仅供参照） */
export interface DiaryAnalysis {
  entry_date: string;
  emotions: string[];
  energy: number; // 1-5
  focus: number; // 1-5
  highlight: string;
  lowlight: string;
  small_win: string;
  tags: string[];
  summary: string;
  model: string;
  created_at: string;
}

export type AnalysisStatus = 'idle' | 'running' | 'done' | 'error' | 'missing-config';

/** OpenAI 兼容接口配置（默认 DeepSeek） */
export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  autoAnalyze: boolean;
}

export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
export const DEEPSEEK_MODEL = 'deepseek-chat';

/** JSON 备份文件结构（跨设备迁移用，明文） */
export interface BackupFile {
  version: 1;
  app: 'peer-diary-web';
  exported_at: string;
  entries: { entry_date: string; content: string; created_at: string; updated_at: string }[];
  analysis: DiaryAnalysis[];
}
