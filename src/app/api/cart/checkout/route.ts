import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createEnrollments } from '@/lib/enrollment-logic'
import { getCurrentAcademicYear } from '@/lib/academic-year'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  })
  if (!user?.familyId) return NextResponse.json({ success: false, error: 'No family found' }, { status: 400 })

  const familyId = user.familyId
  const CURRENT_YEAR = await getCurrentAcademicYear()

  // Top-level ENROLLMENT cart items only (no TEXTBOOK children)
  const enrollmentCartItems = await prisma.cartItem.findMany({
    where: { familyId, type: 'ENROLLMENT', parentCartItemId: null },
    orderBy: { createdAt: 'asc' },
  })

  if (enrollmentCartItems.length === 0) {
    return NextResponse.json({ success: true, data: { enrollmentIds: [] } })
  }

  const enrollmentIds: string[] = []
  const cartUpdates: Promise<unknown>[] = []

  for (const item of enrollmentCartItems) {
    if (!item.studentId || !item.classId) continue

    // Fast path: cart item already references a valid PENDING enrollment
    if (item.enrollmentId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { id: item.enrollmentId, status: 'PENDING' },
      })
      if (enrollment) {
        enrollmentIds.push(enrollment.id)
        continue
      }
    }

    // Slow path: look up by student + class
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { studentId_classId: { studentId: item.studentId, classId: item.classId } },
    })

    if (existingEnrollment?.status === 'PENDING') {
      enrollmentIds.push(existingEnrollment.id)
      cartUpdates.push(
        prisma.cartItem.update({ where: { id: item.id }, data: { enrollmentId: existingEnrollment.id } })
      )
    } else if (!existingEnrollment || existingEnrollment.status === 'CANCELLED') {
      // Fetch textbook IDs for this student from TEXTBOOK child items
      const textbookChildren = await prisma.cartItem.findMany({
        where: { familyId, studentId: item.studentId, type: 'TEXTBOOK', parentCartItemId: item.id },
        select: { textbookId: true },
      })
      const textbookIds = textbookChildren.map(t => t.textbookId).filter(Boolean) as string[]

      const { enrollments } = await createEnrollments(
        item.studentId,
        [item.classId],
        textbookIds,
        CURRENT_YEAR
      )
      if (enrollments[0]) {
        enrollmentIds.push(enrollments[0].id)
        cartUpdates.push(
          prisma.cartItem.update({ where: { id: item.id }, data: { enrollmentId: enrollments[0].id } })
        )
      }
    }
    // CONFIRMED / TRANSFERRED: already paid, skip silently
  }

  await Promise.all(cartUpdates)

  return NextResponse.json({ success: true, data: { enrollmentIds } })
}
