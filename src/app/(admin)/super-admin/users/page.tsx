import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { UsersClient } from './UsersClient'
import type { UserRow } from './UsersClient'

const PAGE_SIZE = 20

export default async function SuperAdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/admin')

  const { page: pageParam, search = '' } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [users, total, superAdminCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        family: { select: { _count: { select: { students: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
  ])

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    studentCount: u.family?._count.students ?? 0,
    createdAt: u.createdAt.toISOString(),
  }))

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">用户管理 / User Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          {total} 位用户 / {total} total users
          {search && <span className="ml-2 text-gray-400">— 搜索: "{search}"</span>}
        </p>
      </div>
      <UsersClient
        users={rows}
        currentUserId={session.user.id}
        superAdminCount={superAdminCount}
        page={page}
        totalPages={totalPages}
        search={search}
      />
    </div>
  )
}
