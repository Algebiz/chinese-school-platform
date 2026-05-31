import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function fmtSchedule(s: unknown): string {
  if (!s || typeof s !== 'object') return '—'
  const o = s as Record<string, string>
  return [o.dayOfWeek, o.startTime && o.endTime ? `${o.startTime}–${o.endTime}` : '', o.room].filter(Boolean).join(' ')
}

export default async function TeacherClassesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      classes: {
        where: { isActive: true },
        include: {
          _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
        },
        orderBy: { name: 'asc' },
      },
    },
  })

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">我的班级 / My Classes</h1>
        <p className="mt-1 text-sm text-gray-500">
          {teacher.name}{teacher.nameEn ? ` · ${teacher.nameEn}` : ''}
        </p>
      </div>

      {teacher.classes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">暂未分配班级 / No classes assigned yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teacher.classes.map((cls) => (
            <div key={cls.id} className="rounded-lg border border-gray-200 bg-white p-5 flex flex-col gap-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">{cls.name}</h2>
                    {cls.nameEn && <p className="text-sm text-gray-500">{cls.nameEn}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    cls.type === 'CHINESE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {cls.type === 'CHINESE' ? '中文班' : '才艺班'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">{fmtSchedule(cls.schedule)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{cls._count.enrollments}</span>
                  <span className="text-gray-400"> / {cls.capacity}</span>
                  <span className="ml-1 text-xs text-gray-400">students</span>
                </span>
                <Link
                  href={`/teacher/classes/${cls.id}`}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  管理班级 / Manage Class →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
