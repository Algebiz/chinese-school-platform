import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role

  const { pathname } = nextUrl
  const isPortalRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/classes') ||
    pathname.startsWith('/enroll') ||
    pathname.startsWith('/checkout')
  const isAdminRoute = pathname.startsWith('/admin')

  if (isPortalRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl))
    }
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/webflow).*)"],
}
