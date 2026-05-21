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

export async function calculateTotalFee(
  classIds: string[],
  textbookIds: string[] = []
): Promise<{
  grandTotal: Prisma.Decimal
  tuitionTotal: Prisma.Decimal
  textbookTotal: Prisma.Decimal
  breakdown: (
    | { type: 'tuition'; classId: string; className: string; fee: Prisma.Decimal }
    | { type: 'textbook'; textbookId: string; textbookName: string; classId: string; fee: Prisma.Decimal }
  )[]
}> {
  const [classes, textbooks] = await Promise.all([
    prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true, fee: true } }),
    textbookIds.length > 0
      ? prisma.textbook.findMany({ where: { id: { in: textbookIds }, isActive: true }, select: { id: true, name: true, classId: true, price: true } })
      : [],
  ])

  let tuitionTotal = new Prisma.Decimal(0)
  let textbookTotal = new Prisma.Decimal(0)
  const breakdown: Awaited<ReturnType<typeof calculateTotalFee>>['breakdown'] = []

  for (const c of classes) {
    tuitionTotal = tuitionTotal.plus(c.fee)
    breakdown.push({ type: 'tuition', classId: c.id, className: c.name, fee: c.fee })
  }
  for (const t of textbooks) {
    textbookTotal = textbookTotal.plus(t.price)
    breakdown.push({ type: 'textbook', textbookId: t.id, textbookName: t.name, classId: t.classId, fee: t.price })
  }

  return { grandTotal: tuitionTotal.plus(textbookTotal), tuitionTotal, textbookTotal, breakdown }
}

export async function createEnrollments(
  studentId: string,
  classIds: string[],
  textbookIds: string[],
  academicYear: string
) {
  const enrollments: Awaited<ReturnType<typeof prisma.enrollment.create>>[] = []
  const waitlists: Awaited<ReturnType<typeof prisma.waitlist.create>>[] = []

  // Pre-fetch active textbooks for the selected IDs so we have price snapshots
  const selectedTextbooks = textbookIds.length > 0
    ? await prisma.textbook.findMany({
        where: { id: { in: textbookIds }, isActive: true },
        select: { id: true, classId: true, price: true },
      })
    : []

  await prisma.$transaction(async (tx) => {
    for (const classId of classIds) {
      // Skip if already on waitlist
      const existingWaitlist = await tx.waitlist.findUnique({
        where: { studentId_classId: { studentId, classId } },
      })
      if (existingWaitlist) continue

      // If already enrolled, include PENDING enrollment so checkout can proceed
      const existingEnrollment = await tx.enrollment.findUnique({
        where: { studentId_classId: { studentId, classId } },
      })
      if (existingEnrollment) {
        if (existingEnrollment.status === 'PENDING') enrollments.push(existingEnrollment)
        continue
      }

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

        // Create EnrollmentTextbook records for textbooks belonging to this class
        const classTextbooks = selectedTextbooks.filter((t) => t.classId === classId)
        for (const tb of classTextbooks) {
          await tx.enrollmentTextbook.upsert({
            where: { enrollmentId_textbookId: { enrollmentId: enrollment.id, textbookId: tb.id } },
            update: {},
            create: { enrollmentId: enrollment.id, textbookId: tb.id, price: tb.price },
          })
        }
      }
    }
  })

  void academicYear
  return { enrollments, waitlists }
}
