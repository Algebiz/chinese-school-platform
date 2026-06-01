import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { registrationId } = await params

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { familyId: true } })
  if (!user?.familyId) return NextResponse.json({ success: false, error: 'No family' }, { status: 400 })

  const reg = await prisma.examRegistration.findUnique({
    where: { id: registrationId },
    include: { student: { select: { familyId: true } } },
  })

  if (!reg) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  if (reg.student.familyId !== user.familyId) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  if (reg.status !== 'PENDING_PAYMENT') {
    return NextResponse.json({ success: false, error: 'Only pending payment registrations can be cancelled', code: 'CANNOT_CANCEL' }, { status: 409 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.examRegistration.update({ where: { id: registrationId }, data: { status: 'CANCELLED' } })
    // Also remove from cart if present
    await tx.cartItem.deleteMany({ where: { examRegistrationId: registrationId } })
  })

  return NextResponse.json({ success: true })
}
