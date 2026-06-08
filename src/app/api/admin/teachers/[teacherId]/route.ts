import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { teacherId } = await params
  const body = await req.json()
  const { name, nameEn, bioEn, bioZh, photoUrl } = body as {
    name?: string
    nameEn?: string
    bioEn?: string
    bioZh?: string
    photoUrl?: string
  }

  // Handle user account linking/unlinking
  if ('userId' in body) {
    const userId: string | null = body.userId

    if (userId === null) {
      // Unlink: get current linked user, reset their role to PARENT
      const current = await prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { userId: true },
      })
      await prisma.$transaction(async (tx) => {
        if (current?.userId) {
          await tx.user.update({
            where: { id: current.userId },
            data: { role: 'PARENT' },
          })
        }
        await tx.teacher.update({
          where: { id: teacherId },
          data: { userId: null },
        })
      })
    } else {
      // Link: verify user exists, set userId on teacher, set user.role = TEACHER
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
      }
      // Ensure this user isn't already linked to another teacher
      const existing = await prisma.teacher.findUnique({ where: { userId } })
      if (existing && existing.id !== teacherId) {
        return NextResponse.json({ success: false, error: 'User already linked to another teacher', code: 'ALREADY_LINKED' }, { status: 409 })
      }
      await prisma.$transaction(async (tx) => {
        await tx.teacher.update({
          where: { id: teacherId },
          data: { userId },
        })
        await tx.user.update({
          where: { id: userId },
          data: { role: 'TEACHER' },
        })

        // Ensure the teacher user has a Family record so they can use the parent portal
        const linked = await tx.user.findUnique({
          where: { id: userId },
          select: { familyId: true },
        })
        if (!linked?.familyId) {
          const family = await tx.family.create({ data: {} })
          await tx.user.update({
            where: { id: userId },
            data: { familyId: family.id },
          })
        }
      })
    }

    const updated = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    return NextResponse.json({ success: true, data: updated })
  }

  // Standard field update
  const teacher = await prisma.teacher.update({
    where: { id: teacherId },
    data: {
      ...(name !== undefined && name.trim() ? { name: name.trim() } : {}),
      ...(nameEn !== undefined ? { nameEn: nameEn || null } : {}),
      ...(bioEn !== undefined ? { bioEn: bioEn || null } : {}),
      ...(bioZh !== undefined ? { bioZh: bioZh || null } : {}),
      ...(photoUrl !== undefined ? { photoUrl: photoUrl || null } : {}),
    },
  })

  return NextResponse.json({ success: true, data: teacher })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { teacherId } = await params
  const year = await getCurrentAcademicYear()

  const activeClasses = await prisma.class.count({
    where: { teacherId, year },
  })
  if (activeClasses > 0) {
    return NextResponse.json(
      { success: false, error: 'Please reassign this teacher\'s classes first', code: 'HAS_CLASSES' },
      { status: 409 }
    )
  }

  // Unlink user account before deleting
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } })
  if (teacher?.userId) {
    await prisma.user.update({ where: { id: teacher.userId }, data: { role: 'PARENT' } })
  }

  await prisma.teacher.delete({ where: { id: teacherId } })
  return NextResponse.json({ success: true })
}
