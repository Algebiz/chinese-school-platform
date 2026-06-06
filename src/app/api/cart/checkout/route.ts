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

  console.log('[cart/checkout] familyId:', familyId, '| ENROLLMENT cart items found:', enrollmentCartItems.length)

  if (enrollmentCartItems.length === 0) {
    console.log('[cart/checkout] No enrollment cart items — returning empty')
    return NextResponse.json({ success: true, data: { enrollmentIds: [] } })
  }

  const enrollmentIds: string[] = []
  const cartUpdates: Promise<unknown>[] = []

  for (const item of enrollmentCartItems) {
    console.log('[cart/checkout] Processing item:', {
      id: item.id, studentId: item.studentId, classId: item.classId, enrollmentId: item.enrollmentId,
    })

    if (!item.studentId || !item.classId) {
      console.log('[cart/checkout] Skipping item — missing studentId or classId')
      continue
    }

    // ── Verify the class still exists in the database ─────────────────────────
    const cls = await prisma.class.findUnique({ where: { id: item.classId } })
    console.log('[cart/checkout] Class lookup:', item.classId, '→', cls ? `found: ${cls.name}` : 'NOT FOUND')

    if (!cls) {
      console.error('[cart/checkout] Class', item.classId, 'not found in DB — removing stale cart item:', item.id)
      cartUpdates.push(
        prisma.cartItem.deleteMany({ where: { OR: [{ id: item.id }, { parentCartItemId: item.id }] } })
      )
      continue
    }

    // ── Fast path: cart item references a valid PENDING enrollment ────────────
    if (item.enrollmentId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { id: item.enrollmentId, status: 'PENDING' },
      })
      if (enrollment) {
        console.log('[cart/checkout] Fast path — found PENDING enrollment:', enrollment.id)
        enrollmentIds.push(enrollment.id)
        continue
      }
      console.log('[cart/checkout] enrollmentId', item.enrollmentId, 'is not PENDING — falling to slow path')
    }

    // ── Slow path: look up enrollment by student + class ─────────────────────
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { studentId_classId: { studentId: item.studentId, classId: item.classId } },
    })
    console.log('[cart/checkout] Slow path — existing enrollment:', existingEnrollment?.id ?? 'none', 'status:', existingEnrollment?.status ?? 'N/A')

    if (existingEnrollment?.status === 'PENDING') {
      // Already PENDING — use it and patch cart item reference
      enrollmentIds.push(existingEnrollment.id)
      cartUpdates.push(
        prisma.cartItem.update({ where: { id: item.id }, data: { enrollmentId: existingEnrollment.id } })
      )

    } else if (existingEnrollment?.status === 'CONFIRMED' || existingEnrollment?.status === 'TRANSFERRED') {
      // Already paid — this cart item is stale; remove it
      console.log('[cart/checkout] Enrollment already', existingEnrollment.status, '— removing stale cart item:', item.id)
      cartUpdates.push(
        prisma.cartItem.deleteMany({ where: { OR: [{ id: item.id }, { parentCartItemId: item.id }] } })
      )

    } else {
      // No enrollment, or CANCELLED — (re-)create via createEnrollments which now handles CANCELLED
      const textbookChildren = await prisma.cartItem.findMany({
        where: { familyId, studentId: item.studentId, type: 'TEXTBOOK', parentCartItemId: item.id },
        select: { textbookId: true },
      })
      const textbookIds = textbookChildren.map(t => t.textbookId).filter(Boolean) as string[]

      console.log('[cart/checkout] Creating/re-activating enrollment for student', item.studentId, 'class', item.classId)
      const { enrollments, waitlists } = await createEnrollments(
        item.studentId, [item.classId], textbookIds, CURRENT_YEAR
      )
      console.log('[cart/checkout] createEnrollments result — enrollments:', enrollments.length, 'waitlists:', waitlists.length)

      if (enrollments[0]) {
        enrollmentIds.push(enrollments[0].id)
        cartUpdates.push(
          prisma.cartItem.update({ where: { id: item.id }, data: { enrollmentId: enrollments[0].id } })
        )
      } else if (waitlists[0]) {
        console.log('[cart/checkout] Class full — student waitlisted, removing cart item:', item.id)
        cartUpdates.push(
          prisma.cartItem.deleteMany({ where: { OR: [{ id: item.id }, { parentCartItemId: item.id }] } })
        )
      } else {
        console.error('[cart/checkout] createEnrollments returned empty — possible stale class ref or logic gap')
      }
    }
  }

  await Promise.all(cartUpdates)

  console.log('[cart/checkout] Returning enrollmentIds:', enrollmentIds)
  return NextResponse.json({ success: true, data: { enrollmentIds } })
}
