import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sortClasses } from '@/lib/class-order'
import { ClassesClient, type ClassRow } from './ClassesClient'
import type { TeacherOption } from '@/components/admin/AddClassModal'

const YEAR = '2025-2026'

export default async function AdminClassesPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const [rawClasses, allTeachers] = await Promise.all([
    prisma.class.findMany({
      where: { year: YEAR },
      include: {
        teacher: { select: { name: true } },
        _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
      },
    }),
    prisma.teacher.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, nameEn: true } }),
  ])

  const classes: ClassRow[] = sortClasses(rawClasses).map((cls) => ({
    id: cls.id,
    name: cls.name,
    nameEn: cls.nameEn,
    type: cls.type,
    teacherName: cls.teacher?.name ?? null,
    capacity: cls.capacity,
    enrolledCount: cls._count.enrollments,
  }))

  const teachers: TeacherOption[] = allTeachers.map((t) => ({
    id: t.id,
    name: t.name,
    nameEn: t.nameEn,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">班级管理</h1>
        <p className="mt-1 text-sm text-gray-500">Class Management · {YEAR}</p>
      </div>
      <ClassesClient initialClasses={classes} teachers={teachers} />
    </div>
  )
}
