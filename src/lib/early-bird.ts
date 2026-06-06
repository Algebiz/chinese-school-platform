import { cache } from 'react'
import { prisma } from '@/lib/db'

// Serializable form for passing to client components as props
export interface EarlyBirdInfo {
  isActive: boolean
  discount: number
  deadline: string | null  // ISO string
}

export interface EarlyBirdConfig {
  enabled: boolean
  discount: number
  deadline: Date | null
  isActive: boolean
}

export const getEarlyBirdConfig = cache(async (): Promise<EarlyBirdConfig> => {
  const config = await prisma.academicYearConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  const enabled = config?.earlyBirdEnabled ?? false
  const discount = Number(config?.earlyBirdDiscount ?? 0)
  const deadline = config?.earlyBirdDeadline ?? null
  const isActive = enabled && discount > 0 && deadline !== null && new Date() < deadline
  return { enabled, discount, deadline, isActive }
})

export function serializeEarlyBird(config: EarlyBirdConfig): EarlyBirdInfo {
  return {
    isActive: config.isActive,
    discount: config.discount,
    deadline: config.deadline?.toISOString() ?? null,
  }
}

export function getDiscountedPrice(
  originalFee: number,
  isLanguageClass: boolean,
  earlyBird: { isActive: boolean; discount: number }
): { finalPrice: number; discount: number; hasDiscount: boolean } {
  if (!earlyBird.isActive || !isLanguageClass) {
    return { finalPrice: originalFee, discount: 0, hasDiscount: false }
  }
  const discount = Math.min(earlyBird.discount, originalFee)
  return { finalPrice: originalFee - discount, discount, hasDiscount: true }
}
