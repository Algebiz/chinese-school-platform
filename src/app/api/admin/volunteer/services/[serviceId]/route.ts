import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  nameZh: z.string().min(1).optional(),
  description: z.string().optional(),
  descriptionZh: z.string().optional(),
  isActive: z.boolean().optional(),
})

async function verifyAdmin() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return null
  return session
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { serviceId } = await params
    const body = await req.json()
    const result = updateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const service = await prisma.volunteerService.update({
      where: { id: serviceId },
      data: result.data,
    })

    return NextResponse.json({ success: true, data: service })
  } catch (error) {
    console.error('PATCH /api/admin/volunteer/services/[serviceId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update service', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { serviceId } = await params

    // Check if any claims reference this service
    const claimCount = await prisma.volunteerClaim.count({ where: { serviceId } })
    if (claimCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete service with existing claims', code: 'HAS_CLAIMS' },
        { status: 409 }
      )
    }

    await prisma.volunteerService.delete({ where: { id: serviceId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/volunteer/services/[serviceId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete service', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
