import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, createdAt: true,
      family: {
        select: {
          id: true, phone: true, address: true, city: true, state: true, zipCode: true,
          students: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true, name: true, nameEn: true, birthDate: true, grade: true, notes: true,
              enrollments: {
                where: { status: 'CONFIRMED' },
                select: { class: { select: { year: true } } },
                orderBy: { createdAt: 'asc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      family: user.family ? {
        ...user.family,
        students: user.family.students.map(s => ({
          ...s,
          birthDate: s.birthDate?.toISOString() ?? null,
          firstEnrollmentYear: s.enrollments[0]?.class.year ?? null,
        })),
      } : null,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, phone, address, city, state, zipCode } = body as {
    name?: string; phone?: string; address?: string; city?: string; state?: string; zipCode?: string
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  })

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined ? { name: name || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
      },
    })

    if (user?.familyId && (address !== undefined || city !== undefined || state !== undefined || zipCode !== undefined)) {
      await tx.family.update({
        where: { id: user.familyId },
        data: {
          ...(address !== undefined ? { address: address || null } : {}),
          ...(city !== undefined ? { city: city || null } : {}),
          ...(state !== undefined ? { state: state || null } : {}),
          ...(zipCode !== undefined ? { zipCode: zipCode || null } : {}),
        },
      })
    }
  })

  return NextResponse.json({ success: true })
}
