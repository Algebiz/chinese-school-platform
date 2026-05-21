import { prisma } from './db'
import { CLASS_LEVEL_PROGRESSION, deriveNextYear } from './class-levels'

export interface ReturningStudentInfo {
  isReturning: boolean
  previousChineseClass: { id: string; name: string; nameEn: string | null } | null
  previousArtsClasses: { id: string; name: string; nameEn: string | null }[]
  suggestedNextChineseClassIds: string[]
  suggestedArtsClassIds: string[]
  adminOverrideClassId: string | null
  isGraduation: boolean
}

export interface EnrollmentWindowStatus {
  returningStudentsCanEnroll: boolean
  newStudentsCanEnroll: boolean
  reEnrollmentOpenDate: Date | null
  newEnrollmentOpenDate: Date | null
}

// Returns IDs of classes in nextAcademicYear that are one level above currentClassId.
export async function getSuggestedNextClasses(
  currentClassId: string,
  nextAcademicYear: string
): Promise<{ id: string; name: string; nameEn: string | null }[]> {
  const currentClass = await prisma.class.findUnique({ where: { id: currentClassId } })
  if (!currentClass?.nameEn) return []

  const nextNames = CLASS_LEVEL_PROGRESSION[currentClass.nameEn] ?? []
  if (nextNames.length === 0) return []

  return prisma.class.findMany({
    where: { year: nextAcademicYear, type: 'CHINESE', nameEn: { in: nextNames } },
    select: { id: true, name: true, nameEn: true },
    orderBy: { nameEn: 'asc' },
  })
}

// Looks up a student's previous-year enrollments and builds re-enrollment suggestions.
// previousYear: the academic year whose confirmed enrollments we inspect (e.g. "2024-2025")
export async function getReturningStudentData(
  studentId: string,
  previousYear: string
): Promise<ReturningStudentInfo> {
  const previousEnrollments = await prisma.enrollment.findMany({
    where: { studentId, status: 'CONFIRMED', class: { year: previousYear } },
    include: { class: { select: { id: true, name: true, nameEn: true, type: true } } },
  })

  if (previousEnrollments.length === 0) {
    return {
      isReturning: false,
      previousChineseClass: null,
      previousArtsClasses: [],
      suggestedNextChineseClassIds: [],
      suggestedArtsClassIds: [],
      adminOverrideClassId: null,
      isGraduation: false,
    }
  }

  const prevChinese = previousEnrollments.find((e) => e.class.type === 'CHINESE')?.class ?? null
  const prevArts = previousEnrollments.filter((e) => e.class.type === 'ARTS').map((e) => e.class)

  // Resolve next year — prefer config, fall back to arithmetic
  const config = await prisma.academicYearConfig.findUnique({ where: { academicYear: previousYear } })
  const nextYear = config?.nextYear ?? deriveNextYear(previousYear)

  // Suggested next Chinese classes
  let suggestedNextChineseClassIds: string[] = []
  let isGraduation = false

  if (prevChinese) {
    const nameEn = prevChinese.nameEn ?? ''
    if (nameEn in CLASS_LEVEL_PROGRESSION && CLASS_LEVEL_PROGRESSION[nameEn].length === 0) {
      isGraduation = true
    } else {
      const suggestions = await getSuggestedNextClasses(prevChinese.id, nextYear)
      suggestedNextChineseClassIds = suggestions.map((c) => c.id)
    }
  }

  // Suggested arts classes in next year matching last year's arts by nameEn
  let suggestedArtsClassIds: string[] = []
  if (prevArts.length > 0) {
    const artsNameEns = prevArts.map((c) => c.nameEn).filter(Boolean) as string[]
    if (artsNameEns.length > 0) {
      const matchingArts = await prisma.class.findMany({
        where: { year: nextYear, type: 'ARTS', nameEn: { in: artsNameEns } },
        select: { id: true },
      })
      suggestedArtsClassIds = matchingArts.map((c) => c.id)
    }
  }

  // Admin override
  const override = await prisma.studentNextClassOverride.findUnique({
    where: { studentId_academicYear: { studentId, academicYear: nextYear } },
    select: { classId: true },
  })

  return {
    isReturning: true,
    previousChineseClass: prevChinese,
    previousArtsClasses: prevArts,
    suggestedNextChineseClassIds,
    suggestedArtsClassIds,
    adminOverrideClassId: override?.classId ?? null,
    isGraduation,
  }
}

// Checks whether the enrollment window is open for a given target enrollment year.
// targetYear: the academic year students are enrolling INTO (e.g. "2025-2026")
export async function isReEnrollmentOpen(targetYear: string): Promise<EnrollmentWindowStatus> {
  const config = await prisma.academicYearConfig.findFirst({
    where: { nextYear: targetYear },
    orderBy: { createdAt: 'desc' },
  })

  if (!config) {
    // No config: enrollment is open to everyone
    return {
      returningStudentsCanEnroll: true,
      newStudentsCanEnroll: true,
      reEnrollmentOpenDate: null,
      newEnrollmentOpenDate: null,
    }
  }

  const now = new Date()
  return {
    returningStudentsCanEnroll: now >= config.reEnrollmentOpenDate,
    newStudentsCanEnroll: now >= config.newEnrollmentOpenDate,
    reEnrollmentOpenDate: config.reEnrollmentOpenDate,
    newEnrollmentOpenDate: config.newEnrollmentOpenDate,
  }
}
