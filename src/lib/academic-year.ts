import { prisma } from '@/lib/db'

export async function getCurrentAcademicYear(): Promise<string> {
  const config = await prisma.academicYearConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  return config?.academicYear ?? '2025-2026'
}

export async function getNextAcademicYear(): Promise<string> {
  const config = await prisma.academicYearConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  return config?.nextYear ?? '2025-2026'
}
