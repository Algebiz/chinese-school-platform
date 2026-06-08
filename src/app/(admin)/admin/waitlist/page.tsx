import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { WaitlistClient } from './WaitlistClient'
import type { WaitlistGroup } from './WaitlistClient'

export default async function WaitlistPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const waitlistEntries = await prisma.waitlist.findMany({
    include: {
      class: {
        select: {
          id: true,
          name: true,
          capacity: true,
          _count: { select: { enrollments: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } } },
        },
      },
      student: { select: { name: true } },
    },
    orderBy: [{ classId: 'asc' }, { position: 'asc' }],
  })

  // Group by class
  const groupMap = new Map<string, WaitlistGroup>()
  for (const entry of waitlistEntries) {
    const confirmedCount = entry.class._count.enrollments
    if (!groupMap.has(entry.classId)) {
      groupMap.set(entry.classId, {
        classId: entry.classId,
        className: entry.class.name,
        capacity: entry.class.capacity,
        confirmedCount,
        entries: [],
      })
    }
    groupMap.get(entry.classId)!.entries.push({
      waitlistId: entry.id,
      studentName: entry.student.name,
      position: entry.position,
      addedAt: entry.createdAt.toISOString(),
      classHasSpace: confirmedCount < entry.class.capacity,
      status: entry.status,
      notifyExpiry: entry.notifyExpiry?.toISOString() ?? null,
    })
  }

  const groups = Array.from(groupMap.values())

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">管理后台 / Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">候补名单 / Waitlist</h1>
        <p className="mt-1 text-sm text-gray-500">
          共 {waitlistEntries.length} 位候补学生 / {waitlistEntries.length} students on waitlist
        </p>
      </div>
      <WaitlistClient groups={groups} />
    </div>
  )
}
