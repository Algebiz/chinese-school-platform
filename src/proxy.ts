import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role

  const { pathname } = nextUrl

  console.log('proxy userRole:', userRole, 'pathname:', pathname)

  const isPortalRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/classes') ||
    pathname.startsWith('/enroll') ||
    pathname.startsWith('/checkout')
  const isAdminRoute = pathname.startsWith('/admin')
  const isSuperAdminRoute = pathname.startsWith('/super-admin')

  if (isPortalRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  if (isSuperAdminRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl))
    if (userRole !== "SUPER_ADMIN") {
      // ADMIN gets bounced to admin panel; everyone else to dashboard
      const dest = userRole === "ADMIN" ? "/admin" : "/dashboard"
      return NextResponse.redirect(new URL(dest, nextUrl))
    }
  }

  if (isAdminRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl))
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/webflow|api/payments).*)"],
}
