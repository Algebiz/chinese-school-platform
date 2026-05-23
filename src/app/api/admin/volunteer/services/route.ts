import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'

const createSchema = z.object({
  name: z.string().min(1),
  nameZh: z.string().min(1),
  description: z.string().optional(),
  descriptionZh: z.string().optional(),
  academicYear: z.string().min(1),
  isActive: z.boolean().optional().default(true),
})

async function verifyAdmin() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return null
  return session
}

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const academicYear = await getCurrentAcademicYear()

    const services = await prisma.volunteerService.findMany({
      where: { academicYear },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: services })
  } catch (error) {
    console.error('GET /api/admin/volunteer/services error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch services', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const body = await req.json()
    const result = createSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const service = await prisma.volunteerService.create({ data: result.data })

    return NextResponse.json({ success: true, data: service }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/volunteer/services error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create service', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
