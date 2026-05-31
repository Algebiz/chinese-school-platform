import { prisma } from './db'

export async function verifyTeacherClassAccess(userId: string, classId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) return { authorized: false as const, teacher: null }

  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: teacher.id },
  })
  return { authorized: !!cls, teacher }
}
