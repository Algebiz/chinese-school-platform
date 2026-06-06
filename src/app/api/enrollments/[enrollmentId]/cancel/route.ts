import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { enrollmentId } = await params

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { familyId: true },
    })

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { status: true, studentId: true, classId: true, student: { select: { familyId: true } } },
    })

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (enrollment.student.familyId !== user?.familyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (enrollment.status !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only pending enrollments can be cancelled by parents',
          code: 'NOT_PENDING',
        },
        { status: 400 }
      )
    }

    const familyId = enrollment.student.familyId

    await prisma.$transaction(async (tx) => {
      await tx.enrollmentTextbook.deleteMany({ where: { enrollmentId } })
      await tx.waitlist.deleteMany({
        where: { studentId: enrollment.studentId, classId: enrollment.classId },
      })
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'CANCELLED' },
      })

      // Remove the linked cart item (matched by enrollmentId or studentId+classId+familyId)
      const cartItem = await tx.cartItem.findFirst({
        where: {
          OR: [
            { enrollmentId },
            { studentId: enrollment.studentId, classId: enrollment.classId, familyId, type: 'ENROLLMENT' },
          ],
        },
      })
      if (cartItem) {
        await tx.cartItem.deleteMany({ where: { parentCartItemId: cartItem.id } })
        await tx.cartItem.delete({ where: { id: cartItem.id } })

        // If no ENROLLMENT items remain, remove the deposit too
        const remainingEnrollments = await tx.cartItem.count({
          where: { familyId, type: 'ENROLLMENT' },
        })
        if (remainingEnrollments === 0) {
          await tx.cartItem.deleteMany({ where: { familyId, type: 'DEPOSIT' } })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel enrollment error:', error)
    return NextResponse.json(
      { success: false, error: 'Cancellation failed', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
