import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LanguageProvider, type Language } from '@/lib/i18n/LanguageContext'
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

export const metadata: Metadata = {
  title: "Charlotte Chinese Academy — Student Registration",
  description: "夏洛特中文学校学生注册系统 — Charlotte Chinese Academy Student Registration Portal",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialLang: Language = 'zh'

  const session = await auth()
  if (session?.user?.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferredLanguage: true },
      })
      if (user?.preferredLanguage === 'en' || user?.preferredLanguage === 'zh') {
        initialLang = user.preferredLanguage as Language
      }
    } catch {
      // fall through to cookie
    }
  } else {
    const cookieStore = await cookies()
    const cookieLang = cookieStore.get('preferredLanguage')?.value
    if (cookieLang === 'en' || cookieLang === 'zh') initialLang = cookieLang
  }

  return (
    <html
      lang={initialLang === 'en' ? 'en' : 'zh'}
      className={`${inter.variable} ${notoSansSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProviderWrapper>
          <LanguageProvider initialLang={initialLang}>
            {children}
          </LanguageProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
