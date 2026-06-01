import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./db"
import { authConfig } from "./auth.config"

// ── Session duration helpers ──────────────────────────────────────────────────

function getExpiryForRole(role: string, rememberMe: boolean): number {
  const durations: Record<string, { normal: number; remember: number }> = {
    SUPER_ADMIN: { normal: 1 * 60 * 60,        remember: 24 * 60 * 60 },
    ADMIN:       { normal: 2 * 60 * 60,        remember: 3 * 24 * 60 * 60 },
    TEACHER:     { normal: 4 * 60 * 60,        remember: 7 * 24 * 60 * 60 },
    PARENT:      { normal: 2 * 60 * 60,        remember: 7 * 24 * 60 * 60 },
  }
  const d = durations[role] ?? durations.PARENT
  return rememberMe ? d.remember : d.normal
}

// ─────────────────────────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30-day absolute ceiling
    updateAge: 60 * 60,         // re-issue token at most once per hour
  },
  providers: [
    CredentialsProvider({
      credentials: {
        email:      { label: "Email",       type: "email"    },
        password:   { label: "Password",    type: "password" },
        rememberMe: { label: "Remember Me", type: "text"     },
      },
      async authorize(credentials) {
        const { email, password, rememberMe } = credentials as {
          email: string; password: string; rememberMe?: string
        }
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user?.password) return null

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          rememberMe: rememberMe === 'true',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // ── New login ──────────────────────────────────────────────────────────
      if (user) {
        token.id       = user.id as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role     = (user as any).role as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.rememberMe = (user as any).rememberMe ?? false

        const expiry = getExpiryForRole(token.role as string, token.rememberMe as boolean)
        token.expiresAt = Math.floor(Date.now() / 1000) + expiry
        return token
      }

      // ── Subsequent requests: check expiry first ────────────────────────────
      if (token.expiresAt && Date.now() / 1000 > (token.expiresAt as number)) {
        return null // expired → force re-login
      }

      // ── Still valid — refresh expiry (auto-renew on activity) ─────────────
      if (token.id) {
        // Re-read role so DB changes (e.g. role promotion) take effect
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        })
        if (dbUser) token.role = dbUser.role

        const expiry = getExpiryForRole(
          token.role as string,
          token.rememberMe as boolean ?? false,
        )
        token.expiresAt = Math.floor(Date.now() / 1000) + expiry
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id as string
        session.user.role = token.role as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).expiresAt  = token.expiresAt
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).rememberMe = token.rememberMe
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
  },
})
