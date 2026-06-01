import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role as string
      }
      // Respect custom expiry so middleware also invalidates expired sessions
      if (token.expiresAt && Date.now() / 1000 > (token.expiresAt as number)) {
        return null
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
