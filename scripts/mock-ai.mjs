// 开发/联调用 mock AI 服务：模拟 OpenAI 兼容的 /chat/completions 接口。
// 用法：node scripts/mock-ai.mjs  →  http://127.0.0.1:8787/v1
// 在应用「设置 → AI 分析」中把 API 地址填为 http://127.0.0.1:8787/v1，
// API Key 随意填，即可在不消耗真实额度的情况下联调分析流程。

import { createServer } from 'node:http';

const ANALYSIS = {
  emotions: ['平静', '满足', '期待'],
  energy: 4,
  focus: 3,
  highlight: '完成了网页版日记应用的搭建',
  lowlight: '下午有些犯困，效率不高',
  small_win: '坚持写了今天的日记',
  tags: ['开发', '记录'],
  summary: '今天是充实的一天，你认真记录了自己的状态，这就是同行最好的开始。',
};

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        id: 'mock-1',
        object: 'chat.completion',
        model: 'mock-model',
        choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(ANALYSIS) }, finish_reason: 'stop' }],
      }),
    );
  });
});

server.listen(8787, '127.0.0.1', () => {
  console.log('mock AI listening on http://127.0.0.1:8787/v1');
});
