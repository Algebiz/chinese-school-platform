import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const classCount = await prisma.class.count()
    const teacherCount = await prisma.teacher.count()
    const enrollmentCount = await prisma.enrollment.count()
    return NextResponse.json({
      status: 'ok',
      classCount,
      teacherCount,
      enrollmentCount,
      dbUrl: process.env.DATABASE_URL?.substring(0, 50) + '...'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: String(error),
      dbUrl: process.env.DATABASE_URL?.substring(0, 50) + '...'
    }, { status: 500 })
  }
}
