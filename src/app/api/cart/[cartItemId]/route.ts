import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ cartItemId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { cartItemId } = await params

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { familyId: true } })
  if (!user?.familyId) return NextResponse.json({ success: false, error: 'No family' }, { status: 400 })

  const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } })
  if (!item || item.familyId !== user.familyId) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  // Delete this item + its children in a transaction, and cancel any linked enrollment
  await prisma.$transaction(async (tx) => {
    // Cancel the linked PENDING enrollment so the spot is freed
    if (item.type === 'ENROLLMENT' && item.enrollmentId) {
      const enrollment = await tx.enrollment.findFirst({
        where: { id: item.enrollmentId, status: 'PENDING' },
      })
      if (enrollment) {
        await tx.enrollmentTextbook.deleteMany({ where: { enrollmentId: item.enrollmentId } })
        await tx.enrollment.update({
          where: { id: item.enrollmentId },
          data: { status: 'CANCELLED' },
        })
      }
    }

    // Delete child textbook items then the cart item itself
    await tx.cartItem.deleteMany({ where: { parentCartItemId: cartItemId } })
    await tx.cartItem.delete({ where: { id: cartItemId } })

    // If no ENROLLMENT items remain, remove the deposit too
    if (item.type === 'ENROLLMENT' && user.familyId) {
      const remainingEnrollments = await tx.cartItem.count({
        where: { familyId: user.familyId, type: 'ENROLLMENT' },
      })
      if (remainingEnrollments === 0) {
        await tx.cartItem.deleteMany({ where: { familyId: user.familyId, type: 'DEPOSIT' } })
      }
    }
  })

  const updated = await prisma.cartItem.findMany({
    where: { familyId: user.familyId ?? undefined },
    include: { student: { select: { id: true, name: true, nameEn: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    success: true,
    data: updated.map(i => ({ ...i, price: i.price.toString(), createdAt: i.createdAt.toISOString() })),
  })
}
