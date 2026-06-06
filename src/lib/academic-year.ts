import { cache } from 'react'
import { prisma } from '@/lib/db'

export const getCurrentAcademicYear = cache(async (): Promise<string> => {
  const config = await prisma.academicYearConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  return config?.academicYear ?? '2026-2027'
})

export const getNextAcademicYear = cache(async (): Promise<string> => {
  const config = await prisma.academicYearConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  return config?.nextYear ?? '2027-2028'
})
