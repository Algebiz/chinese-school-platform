import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./db"
import { authConfig } from "./auth.config"

// ── Session duration maps (seconds) ──────────────────────────────────────────

const EXPIRATIONS: Record<string, number> = {
  SUPER_ADMIN: 1 * 60 * 60,   // 1 hour
  ADMIN:       2 * 60 * 60,   // 2 hours
  TEACHER:     4 * 60 * 60,   // 4 hours
  PARENT:      2 * 60 * 60,   // 2 hours
}

const REMEMBER_ME_EXPIRATIONS: Record<string, number> = {
  SUPER_ADMIN: 24 * 60 * 60,      // 1 day
  ADMIN:       3 * 24 * 60 * 60,  // 3 days
  TEACHER:     7 * 24 * 60 * 60,  // 7 days
  PARENT:      7 * 24 * 60 * 60,  // 7 days
}

// ─────────────────────────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt" },
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
      if (user) {
        // First sign-in — set all custom fields
        token.id        = user.id as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role      = (user as any).role as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.rememberMe = (user as any).rememberMe ?? false

        const role   = (token.role as string | undefined) ?? 'PARENT'
        const expiry = token.rememberMe
          ? (REMEMBER_ME_EXPIRATIONS[role] ?? REMEMBER_ME_EXPIRATIONS.PARENT)
          : (EXPIRATIONS[role] ?? EXPIRATIONS.PARENT)

        token.expiresAt = Math.floor(Date.now() / 1000) + expiry
      } else if (token.id) {
        // Subsequent requests — re-read role so DB changes take effect
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        })
        if (dbUser) token.role = dbUser.role
      }

      // Enforce our custom expiry (return null to invalidate)
      if (token.expiresAt && Date.now() / 1000 > (token.expiresAt as number)) {
        return null
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
