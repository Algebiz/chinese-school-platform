import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTeacherClassAccess } from '@/lib/teacher-auth'
import { sortByLastNamePinyin } from '@/lib/pinyin-sort'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { TeacherClassTabs } from './TeacherClassTabs'

function fmtSchedule(s: unknown): string {
  if (!s || typeof s !== 'object') return '—'
  const o = s as Record<string, string>
  return [o.dayOfWeek, o.startTime && o.endTime ? `${o.startTime}–${o.endTime}` : '', o.room].filter(Boolean).join(' ')
}

export default async function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { classId } = await params
  const { authorized, teacher } = await verifyTeacherClassAccess(session.user.id, classId)

  if (!teacher) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="text-lg font-semibold text-amber-800">
          您的账号尚未关联教师档案，请联系管理员。
        </p>
        <p className="mt-1 text-sm text-amber-700">
          Your account is not linked to a teacher profile. Please contact admin.
        </p>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-lg font-semibold text-red-800">无权访问此班级 / Access denied</p>
        <p className="mt-1 text-sm text-red-700">
          This class is not assigned to you.
        </p>
      </div>
    )
  }

  const YEAR = await getCurrentAcademicYear()

  const [cls, enrollments, examRegistrations] = await Promise.all([
    prisma.class.findUnique({
      where: { id: classId },
      include: {
        textbooks: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.enrollment.findMany({
      where: { classId, status: 'CONFIRMED' },
      include: {
        student: {
          include: {
            family: { include: { users: { select: { name: true, email: true, phone: true } } } },
            enrollments: {
              where: { status: 'CONFIRMED', class: { year: { not: YEAR } } },
              select: { id: true },
            },
          },
        },
      },
    }),
    prisma.examRegistration.findMany({
      where: {
        student: { enrollments: { some: { classId, status: 'CONFIRMED' } } },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        student: { select: { name: true, nameEn: true } },
        examSession: { select: { examType: true, level: true, examDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!cls) {
    return <div className="text-center text-gray-500 py-12">班级不存在 / Class not found</div>
  }

  const sorted = sortByLastNamePinyin(enrollments, (e) => e.student.name)

  const students = sorted.map((e, i) => {
    const parent = e.student.family?.users[0]
    const isPriorYear = e.student.enrollments.length > 0
    return {
      index: i + 1,
      id: e.student.id,
      name: e.student.name,
      nameEn: e.student.nameEn,
      parentName: parent?.name ?? null,
      parentPhone: parent?.phone ?? e.student.family?.users[0]?.phone ?? null,
      parentEmail: parent?.email ?? null,
      enrolledAt: e.createdAt.toISOString(),
      isReturning: isPriorYear,
    }
  })

  const textbooks = cls.textbooks.map((t) => ({
    id: t.id,
    name: t.name,
    nameZh: t.nameZh,
    description: t.description,
    descriptionZh: t.descriptionZh,
    price: t.price.toString(),
    isActive: t.isActive,
  }))

  const exams = examRegistrations.map((r) => ({
    id: r.id,
    studentName: r.student.name,
    studentNameEn: r.student.nameEn,
    examType: r.examSession.examType,
    level: r.examSession.level,
    examDate: r.examSession.examDate.toISOString(),
    status: r.status,
    studentNameZh: r.studentNameZh,
  }))

  const classInfo = {
    name: cls.name,
    nameEn: cls.nameEn,
    type: cls.type,
    description: cls.description,
    descriptionZh: cls.descriptionZh,
    notes: cls.notes,
    scheduleDisplay: fmtSchedule(cls.schedule),
    capacity: cls.capacity,
    fee: cls.fee.toString(),
    year: cls.year,
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/teacher/classes" className="hover:text-gray-700">我的班级</a>
          <span>/</span>
          <span>{cls.name}</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{cls.name}</h1>
        {cls.nameEn && <p className="text-sm text-gray-500">{cls.nameEn} · {cls.year}</p>}
      </div>

      <TeacherClassTabs
        classId={classId}
        cls={classInfo}
        students={students}
        textbooks={textbooks}
        examRegistrations={exams}
      />
    </div>
  )
}
