import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const SETTINGS_ID = 'system-settings-singleton'

const schema = z.object({
  schoolNameZh: z.string().min(1),
  schoolNameEn: z.string().min(1),
  contactEmail: z.string().default(''),
  contactPhone: z.string().default(''),
})

async function verifySuperAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') return null
  return session
}

export async function GET() {
  const session = await verifySuperAdmin()
  if (!session) return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

  const settings = await prisma.systemSettings.findFirst()
  return NextResponse.json({ success: true, data: settings })
}

export async function POST(req: NextRequest) {
  const session = await verifySuperAdmin()
  if (!session) return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const settings = await prisma.systemSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { ...result.data, updatedBy: session.user.id },
    create: { id: SETTINGS_ID, ...result.data, updatedBy: session.user.id },
  })

  return NextResponse.json({ success: true, data: settings })
}

// DELETE — danger zone: purge all PENDING enrollments
export async function DELETE() {
  const session = await verifySuperAdmin()
  if (!session) return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

  const { count } = await prisma.enrollment.deleteMany({ where: { status: 'PENDING' } })
  return NextResponse.json({ success: true, data: { deleted: count } })
}
