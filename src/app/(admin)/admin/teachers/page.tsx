import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TeachersClient, type TeacherWithClasses } from './TeachersClient'

export default async function TeachersPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const teachers = await prisma.teacher.findMany({
    include: {
      classes: {
        where: { year: '2025-2026' },
        select: { id: true, name: true, nameEn: true, type: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const withClasses: TeacherWithClasses[] = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    nameEn: t.nameEn,
    bioEn: t.bioEn,
    bioZh: t.bioZh,
    photoUrl: t.photoUrl,
    classes: t.classes,
  }))

  // Group: CSL teachers (have at least one CSL class), CHL teachers, ARTS-only teachers
  const cslTeachers = withClasses.filter((t) =>
    t.classes.some((c) => c.type === 'CHINESE' && c.name.includes('第二语言'))
  )
  const cslIds = new Set(cslTeachers.map((t) => t.id))

  const chlTeachers = withClasses.filter(
    (t) =>
      !cslIds.has(t.id) &&
      t.classes.some((c) => c.type === 'CHINESE')
  )
  const chlIds = new Set(chlTeachers.map((t) => t.id))

  const artsTeachers = withClasses.filter(
    (t) => !cslIds.has(t.id) && !chlIds.has(t.id)
  )

  const groups = [
    { label: '中文母语班教师', labelEn: 'CHL Teachers', teachers: chlTeachers },
    { label: '中文第二语言班教师', labelEn: 'CSL Teachers', teachers: cslTeachers },
    { label: '才艺班教师', labelEn: 'Arts Teachers', teachers: artsTeachers },
  ].filter((g) => g.teachers.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">教师管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          Teacher Management · {withClasses.length} teachers total
        </p>
      </div>
      <TeachersClient groups={groups} />
    </div>
  )
}
