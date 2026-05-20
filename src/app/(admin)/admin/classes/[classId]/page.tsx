import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ClassDetailClient } from './ClassDetailClient'
import type { EnrolledStudent, AvailableClass } from './ClassDetailClient'

function fmtSchedule(s: unknown): string {
  if (!s || typeof s !== 'object') return '—'
  const o = s as Record<string, string>
  return [o.dayOfWeek, o.startTime && o.endTime ? `${o.startTime}–${o.endTime}` : '', o.room].filter(Boolean).join(' ')
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/portal/dashboard')

  const { classId } = await params

  const [cls, enrollments, allSameTypeClasses] = await Promise.all([
    prisma.class.findUnique({
      where: { id: classId },
      include: { teacher: { select: { name: true } } },
    }),
    prisma.enrollment.findMany({
      where: { classId, status: 'CONFIRMED' },
      include: {
        student: {
          include: {
            family: {
              include: { users: { select: { name: true, email: true, phone: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.class.findMany({
      where: { year: '2025-2026', id: { not: classId } },
      include: {
        _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
      },
    }),
  ])

  if (!cls) notFound()

  const enrolledStudents: EnrolledStudent[] = enrollments.map((e) => {
    const parent = e.student.family?.users[0]
    return {
      enrollmentId: e.id,
      studentName: e.student.name,
      studentNameEn: e.student.nameEn,
      parentName: parent?.name ?? '—',
      phone: parent?.phone ?? null,
      email: parent?.email ?? '—',
      enrolledAt: e.createdAt.toISOString(),
    }
  })

  // Available classes: same type as current, with spots remaining info
  const availableClasses: AvailableClass[] = allSameTypeClasses
    .filter((c) => c.type === cls.type)
    .map((c) => ({
      id: c.id,
      name: c.name,
      spotsRemaining: Math.max(0, c.capacity - c._count.enrollments),
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500">
          <a href="/admin/classes" className="hover:text-gray-700">班级管理</a>
          {' / '}
          {cls.name}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{cls.name}</h1>
        {cls.nameEn && <p className="text-sm text-gray-500">{cls.nameEn}</p>}
      </div>

      {/* Class info card */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs text-gray-400">老师 / Teacher</p>
          <p className="mt-1 font-medium">{cls.teacher?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">时间 / Schedule</p>
          <p className="mt-1 font-medium text-sm">{fmtSchedule(cls.schedule)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">总名额 / Capacity</p>
          <p className="mt-1 font-medium">{cls.capacity}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">已报名 / Enrolled</p>
          <p className="mt-1 font-medium">
            {enrollments.length}
            <span className="ml-1 text-sm text-gray-400">
              / {cls.capacity} ({Math.max(0, cls.capacity - enrollments.length)} 余)
            </span>
          </p>
        </div>
      </div>

      {/* Student table (client component) */}
      <div>
        <h2 className="mb-3 font-semibold text-gray-900">
          已报名学生 / Confirmed Students ({enrollments.length})
        </h2>
        <ClassDetailClient
          enrolledStudents={enrolledStudents}
          currentClassName={cls.name}
          availableClasses={availableClasses}
        />
      </div>
    </div>
  )
}
