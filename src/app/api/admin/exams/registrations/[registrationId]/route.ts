import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendExamRegistrationApproved, sendExamRegistrationRejected } from '@/lib/email'

function isAdmin(role?: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('confirm') }),
  z.object({ action: z.literal('reject'), reason: z.string().min(1) }),
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { registrationId } = await params
  const body = await req.json()
  const result = patchSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const registration = await prisma.examRegistration.findUnique({
    where: { id: registrationId },
    include: {
      examSession: true,
      student: {
        include: { family: { include: { users: { select: { email: true, name: true }, take: 1 } } } },
      },
    },
  })

  if (!registration) {
    return NextResponse.json({ success: false, error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  if (registration.status !== 'PAID') {
    return NextResponse.json(
      { success: false, error: 'Only PAID registrations can be confirmed or rejected', code: 'INVALID_STATUS' },
      { status: 400 }
    )
  }

  const adminId = session!.user.id
  const data = result.data

  if (data.action === 'confirm') {
    await prisma.examRegistration.update({
      where: { id: registrationId },
      data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedBy: adminId },
    })

    try {
      const parentUser = registration.student.family?.users[0]
      if (parentUser?.email) {
        const s = registration.examSession
        await sendExamRegistrationApproved(parentUser.email, {
          parentName: parentUser.name ?? '家长',
          studentName: registration.studentNameZh,
          examType: s.examType,
          level: s.level,
          examDate: s.examDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          location: s.location,
          locationZh: s.locationZh,
          registrationId,
          academicYear: s.academicYear,
        })
      }
    } catch (err) {
      console.error('Failed to send approval email:', err)
    }

    return NextResponse.json({ success: true, data: { status: 'CONFIRMED' } })
  }

  // reject
  await prisma.examRegistration.update({
    where: { id: registrationId },
    data: { status: 'REJECTED', rejectedAt: new Date(), rejectedBy: adminId, rejectionReason: data.reason },
  })

  try {
    const parentUser = registration.student.family?.users[0]
    if (parentUser?.email) {
      const s = registration.examSession
      await sendExamRegistrationRejected(parentUser.email, {
        parentName: parentUser.name ?? '家长',
        studentName: registration.studentNameZh,
        examType: s.examType,
        level: s.level,
        examDate: s.examDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        rejectionReason: data.reason,
        registrationId,
        academicYear: s.academicYear,
      })
    }
  } catch (err) {
    console.error('Failed to send rejection email:', err)
  }

  return NextResponse.json({ success: true, data: { status: 'REJECTED' } })
}
