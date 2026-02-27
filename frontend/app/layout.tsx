import './globals.css';
import type { Metadata } from 'next';
import { MuiProvider } from './mui-provider';

export const metadata: Metadata = {
  title: 'AI Starter Kit',
  description: 'Next.js + NestJS + LangChain + Ollama starter kit',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MuiProvider>{children}</MuiProvider>
      </body>
    </html>
  );
}
