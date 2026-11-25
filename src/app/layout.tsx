import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TravelGrowth AI — 文旅内容营销智能工作台',
  description: '面向景区、民宿、旅游企业与文化传播机构的智能内容营销工作台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#f5f2eb] text-[#1a2420] antialiased">
        {children}
      </body>
    </html>
  );
}
