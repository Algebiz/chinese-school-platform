import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ClassBrowser } from './ClassBrowser'
import type { ClassData } from '@/components/ClassCard'
import { sortClasses } from '@/lib/class-order'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { getEarlyBirdConfig, serializeEarlyBird } from '@/lib/early-bird'

export default async function ClassesPage() {
  // auth() and getCurrentAcademicYear() are independent — run in parallel
  const [session, CURRENT_YEAR] = await Promise.all([auth(), getCurrentAcademicYear()])
  if (!session) redirect('/login')

  const includeSpec = {
    teacher: {
      select: {
        id: true,
        name: true,
        nameEn: true,
        bioEn: true,
        bioZh: true,
        photoUrl: true,
      } as const,
    },
    _count: {
      select: { enrollments: { where: { status: 'CONFIRMED' as const } } },
    },
    textbooks: {
      where: { isActive: true as const },
      select: {
        id: true,
        name: true,
        nameZh: true,
        price: true,
        description: true,
      } as const,
      orderBy: { createdAt: 'asc' as const },
    },
  } as const

  const [rawClassesResult, earlyBirdConfig] = await Promise.all([
    prisma.class.findMany({ where: { year: CURRENT_YEAR }, include: includeSpec }),
    getEarlyBirdConfig(),
  ])
  let rawClasses = rawClassesResult

  // Fallback: if no classes configured for this year, use the most recent year with data
  if (rawClasses.length === 0) {
    const latest = await prisma.class.findFirst({
      orderBy: { year: 'desc' },
      select: { year: true },
    })
    if (latest) {
      rawClasses = await prisma.class.findMany({
        where: { year: latest.year },
        include: includeSpec,
      })
    }
  }

  const classes: ClassData[] = sortClasses(
    rawClasses.map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      type: c.type,
      description: c.description,
      descriptionZh: c.descriptionZh,
      teacher: c.teacher,
      schedule: c.schedule,
      capacity: c.capacity,
      fee: c.fee.toString(),
      year: c.year,
      enrolledCount: c._count.enrollments,
      spotsRemaining: Math.max(0, c.capacity - c._count.enrollments),
      textbooks: c.textbooks.map((t) => ({
        id: t.id,
        name: t.name,
        nameZh: t.nameZh,
        price: t.price.toString(),
        description: t.description,
      })),
    }))
  )

  const earlyBird = serializeEarlyBird(earlyBirdConfig)

  return (
    <div className="bg-gray-50">
      <ClassBrowser
        chineseClasses={classes.filter((c) => c.type === 'CHINESE')}
        artsClasses={classes.filter((c) => c.type === 'ARTS')}
        earlyBird={earlyBird}
      />
    </div>
  )
}
