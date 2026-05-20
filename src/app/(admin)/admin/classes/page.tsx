import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const YEAR = '2025-2026'

const TYPE_LABEL: Record<string, string> = {
  CHINESE: '中文班',
  ARTS: '才艺班',
}

export default async function AdminClassesPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/portal/dashboard')

  const classes = await prisma.class.findMany({
    where: { year: YEAR },
    include: {
      teacher: { select: { name: true } },
      _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">班级管理</h1>
        <p className="mt-1 text-sm text-gray-500">Class Management · {YEAR}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-6 py-3">班级名称</th>
              <th className="px-6 py-3">类型</th>
              <th className="px-6 py-3">老师</th>
              <th className="px-6 py-3 text-center">已报名</th>
              <th className="px-6 py-3 text-center">总名额</th>
              <th className="px-6 py-3 text-center">剩余</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {classes.map((cls) => {
              const enrolled = cls._count.enrollments
              const remaining = Math.max(0, cls.capacity - enrolled)
              return (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{cls.name}</p>
                    {cls.nameEn && <p className="text-xs text-gray-400">{cls.nameEn}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      cls.type === 'CHINESE'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {TYPE_LABEL[cls.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{cls.teacher?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-center font-medium text-gray-900">{enrolled}</td>
                  <td className="px-6 py-4 text-center text-gray-500">{cls.capacity}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={remaining === 0 ? 'font-medium text-red-600' : 'font-medium text-green-600'}>
                      {remaining}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/classes/${cls.id}`}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      查看详情 →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {classes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  暂无班级数据 / No classes found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
