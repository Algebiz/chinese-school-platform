import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const studentCount = await prisma.student.count()
    const enrollmentCount = await prisma.enrollment.count()
    const confirmedCount = await prisma.enrollment.count({
      where: { status: 'CONFIRMED' }
    })
    return NextResponse.json({
      studentCount,
      enrollmentCount,
      confirmedCount,
      dbUrl: process.env.DATABASE_URL?.substring(0, 40) + '...' // show first 40 chars only
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
