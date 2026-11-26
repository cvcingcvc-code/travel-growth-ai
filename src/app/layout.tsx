import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TravelGrowth AI 2.0 — 企业专属 AI 营销运营工作台',
  description: '企业入驻、知识库构建、专属营销 Agent、同行爆款分析、营销方案、内容生产与数据复盘闭环工作台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased">
        {children}
      </body>
    </html>
  );
}
