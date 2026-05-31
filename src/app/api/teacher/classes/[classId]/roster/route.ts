import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTeacherClassAccess } from '@/lib/teacher-auth'
import { sortByLastNamePinyin } from '@/lib/pinyin-sort'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { classId } = await params
  const { authorized, teacher } = await verifyTeacherClassAccess(session!.user.id, classId)
  if (!authorized || !teacher) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { name: true, nameEn: true, year: true },
  })
  if (!cls) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const enrollments = await prisma.enrollment.findMany({
    where: { classId, status: 'CONFIRMED' },
    include: {
      student: {
        include: {
          family: { include: { users: { select: { name: true, email: true, phone: true } } } },
        },
      },
    },
  })

  const sorted = sortByLastNamePinyin(enrollments, (e) => e.student.name)

  const rows = sorted.map((e, i) => {
    const parent = e.student.family?.users[0]
    return [
      i + 1,
      e.student.name,
      e.student.nameEn ?? '',
      parent?.name ?? '',
      parent?.phone ?? e.student.family?.users[0]?.phone ?? '',
      parent?.email ?? '',
      new Date(e.createdAt).toLocaleDateString('en-US'),
    ]
  })

  const header = ['#', 'Student Name (ZH)', 'Student Name (EN)', 'Parent', 'Phone', 'Email', 'Enrolled Date']
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const filename = `roster-${cls.nameEn ?? cls.name}-${cls.year}.csv`
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
