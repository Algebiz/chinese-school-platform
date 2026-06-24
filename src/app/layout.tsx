import "./globals.css";
import type { Metadata } from "next";
import { Inter, Noto_Sans_SC, Sora } from "next/font/google";
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { SessionProviderWrapper } from '@/components/SessionProviderWrapper'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
})

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sans-sc',
})

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-sora',
})

export const metadata: Metadata = {
  title: "Charlotte Chinese Academy — Student Registration",
  description: "夏洛特中文学校学生注册系统 — Charlotte Chinese Academy Student Registration Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${notoSansSC.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProviderWrapper>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
