import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { ExamsClient } from '@/components/portal/ExamsClient'

export default async function ExamsPage() {
  const session = await auth()
  const CURRENT_YEAR = await getCurrentAcademicYear()

  const [sessions, myStudents] = await Promise.all([
    prisma.examSession.findMany({
      where: { isActive: true, academicYear: CURRENT_YEAR },
      include: { _count: { select: { registrations: { where: { status: { notIn: ['CANCELLED'] } } } } } },
      orderBy: [{ examDate: 'asc' }, { level: 'asc' }],
    }),
    session
      ? prisma.student.findMany({
          where: { family: { users: { some: { id: session.user.id } } } },
          select: {
            id: true,
            name: true,
            nameEn: true,
            examRegistrations: {
              where: { examSession: { academicYear: CURRENT_YEAR } },
              include: { examSession: { select: { id: true, examType: true, level: true } } },
            },
          },
        })
      : [],
  ])

  return (
    <ExamsClient
      currentYear={CURRENT_YEAR}
      sessions={sessions.map((s) => ({
        id: s.id,
        examType: s.examType,
        level: s.level,
        examDate: s.examDate.toISOString(),
        location: s.location,
        locationZh: s.locationZh,
        fee: s.fee.toString(),
        capacity: s.capacity,
        registeredCount: s._count.registrations,
        registrationDeadline: s.registrationDeadline.toISOString(),
        notesZh: s.notesZh ?? null,
        isActive: s.isActive,
      }))}
      myStudents={myStudents.map((s) => ({
        id: s.id,
        name: s.name,
        nameEn: s.nameEn,
        examRegistrations: s.examRegistrations.map((r) => ({
          id: r.id,
          examSessionId: r.examSessionId,
          status: r.status,
          examSession: { id: r.examSession.id, examType: r.examSession.examType, level: r.examSession.level },
        })),
      }))}
    />
  )
}
