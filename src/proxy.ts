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

  const isPublicRoute =
    pathname === '/privacy-policy' ||
    pathname === '/terms-of-use' ||
    pathname.startsWith('/contact')

  if (isPublicRoute) return NextResponse.next()

  const isPortalRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/classes') ||
    pathname.startsWith('/enroll') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/exams') ||
    pathname.startsWith('/exam-checkout') ||
    pathname.startsWith('/volunteer') ||
    pathname.startsWith('/profile')
  const isTeacherRoute = pathname.startsWith('/teacher')
  const isAdminRoute = pathname.startsWith('/admin')
  const isSuperAdminRoute = pathname.startsWith('/super-admin')

  if (isPortalRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  if (isTeacherRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl))
    if (userRole !== "TEACHER" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
  }

  if (isSuperAdminRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl))
    if (userRole !== "SUPER_ADMIN") {
      const dest = userRole === "ADMIN" ? "/admin" : userRole === "TEACHER" ? "/teacher/classes" : "/dashboard"
      return NextResponse.redirect(new URL(dest, nextUrl))
    }
  }

  if (isAdminRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl))
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      const dest = userRole === "TEACHER" ? "/teacher/classes" : "/dashboard"
      return NextResponse.redirect(new URL(dest, nextUrl))
    }
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/webflow|api/payments).*)"],
}
