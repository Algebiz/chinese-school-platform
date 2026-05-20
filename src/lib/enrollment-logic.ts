import { prisma } from './db'
import { Prisma } from '@/generated/prisma'

// ── Schedule helpers ──────────────────────────────────────────────────────────

interface ScheduleEntry {
  dayOfWeek: string
  startTime: string
  endTime: string
}

function parseTime(t: string): number {
  const upper = t.trim().toUpperCase()
  const isPM = upper.includes('PM')
  const isAM = upper.includes('AM')
  const clean = upper.replace(/[AP]M/, '').trim()
  const [h, m] = clean.split(':').map(Number)
  let hours = h
  if (isPM && hours !== 12) hours += 12
  if (isAM && hours === 12) hours = 0
  return hours * 60 + (m || 0)
}

function schedulesOverlap(a: ScheduleEntry, b: ScheduleEntry): boolean {
  if (a.dayOfWeek.toLowerCase() !== b.dayOfWeek.toLowerCase()) return false
  return parseTime(a.startTime) < parseTime(b.endTime) &&
    parseTime(b.startTime) < parseTime(a.endTime)
}

function extractSchedule(json: unknown): ScheduleEntry | null {
  if (!json || typeof json !== 'object') return null
  const s = json as Record<string, unknown>
  if (
    typeof s.dayOfWeek !== 'string' ||
    typeof s.startTime !== 'string' ||
    typeof s.endTime !== 'string'
  ) return null
  return { dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }
}

// ── Exported functions ────────────────────────────────────────────────────────

export async function checkTimeConflict(
  studentId: string,
  newClassId: string,
  academicYear: string
): Promise<{ hasConflict: boolean; conflictingClass?: { id: string; name: string } }> {
  const [newClass, existingEnrollments] = await Promise.all([
    prisma.class.findUnique({ where: { id: newClassId } }),
    prisma.enrollment.findMany({
      where: {
        studentId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        class: { year: academicYear, id: { not: newClassId } },
      },
      include: { class: true },
    }),
  ])

  if (!newClass) return { hasConflict: false }
  const newSchedule = extractSchedule(newClass.schedule)
  if (!newSchedule) return { hasConflict: false }

  for (const enrollment of existingEnrollments) {
    const s = extractSchedule(enrollment.class.schedule)
    if (s && schedulesOverlap(newSchedule, s)) {
      return { hasConflict: true, conflictingClass: { id: enrollment.class.id, name: enrollment.class.name } }
    }
  }

  return { hasConflict: false }
}

export async function checkCapacity(
  classId: string
): Promise<{ available: boolean; remaining: number }> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
    },
  })
  if (!cls) return { available: false, remaining: 0 }
  const remaining = Math.max(0, cls.capacity - cls._count.enrollments)
  return { available: remaining > 0, remaining }
}

export async function calculateTotalFee(classIds: string[]): Promise<{
  total: Prisma.Decimal
  breakdown: { classId: string; className: string; fee: Prisma.Decimal }[]
}> {
  const classes = await prisma.class.findMany({
    where: { id: { in: classIds } },
    select: { id: true, name: true, fee: true },
  })

  let total = new Prisma.Decimal(0)
  const breakdown = classes.map((c) => {
    total = total.plus(c.fee)
    return { classId: c.id, className: c.name, fee: c.fee }
  })

  return { total, breakdown }
}

export async function createEnrollments(
  studentId: string,
  classIds: string[],
  academicYear: string
) {
  const enrollments: Awaited<ReturnType<typeof prisma.enrollment.create>>[] = []
  const waitlists: Awaited<ReturnType<typeof prisma.waitlist.create>>[] = []

  await prisma.$transaction(async (tx) => {
    for (const classId of classIds) {
      // Skip if already enrolled or waitlisted
      const [existingEnrollment, existingWaitlist] = await Promise.all([
        tx.enrollment.findUnique({ where: { studentId_classId: { studentId, classId } } }),
        tx.waitlist.findUnique({ where: { studentId_classId: { studentId, classId } } }),
      ])
      if (existingEnrollment || existingWaitlist) continue

      // Count non-cancelled enrollments against capacity (PENDING + CONFIRMED)
      const [takenCount, cls] = await Promise.all([
        tx.enrollment.count({ where: { classId, status: { in: ['PENDING', 'CONFIRMED'] } } }),
        tx.class.findUnique({ where: { id: classId }, select: { capacity: true } }),
      ])
      if (!cls) continue

      if (takenCount >= cls.capacity) {
        const position = (await tx.waitlist.count({ where: { classId } })) + 1
        const waitlist = await tx.waitlist.create({ data: { studentId, classId, position } })
        waitlists.push(waitlist)
      } else {
        const enrollment = await tx.enrollment.create({
          data: { studentId, classId, status: 'PENDING' },
        })
        enrollments.push(enrollment)
      }
    }
  })

  // Attach academic year reference for context (not stored on Enrollment itself)
  void academicYear
  return { enrollments, waitlists }
}
