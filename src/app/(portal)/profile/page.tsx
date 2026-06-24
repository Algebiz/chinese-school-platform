import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProfileClient, type ProfileData } from '@/components/portal/ProfileClient'
import { LanguageText } from '@/components/LanguageText'
import { BilingualTitle } from '@/components/BilingualTitle'

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, createdAt: true,
      family: {
        select: {
          id: true, phone: true, address: true, city: true, state: true, zipCode: true,
          students: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true, name: true, nameEn: true, birthDate: true, grade: true, notes: true,
              enrollments: {
                where: { status: 'CONFIRMED' },
                select: { class: { select: { year: true } } },
                orderBy: { createdAt: 'asc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!user) redirect('/login')

  const profile: ProfileData = {
    id: user.id,
    name: user.name,
    email: user.email ?? '',
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    family: user.family ? {
      id: user.family.id,
      phone: user.family.phone,
      address: user.family.address,
      city: user.family.city,
      state: user.family.state,
      zipCode: user.family.zipCode,
      students: user.family.students.map(s => ({
        id: s.id,
        name: s.name,
        nameEn: s.nameEn,
        birthDate: s.birthDate?.toISOString() ?? null,
        grade: s.grade,
        notes: s.notes,
        firstEnrollmentYear: s.enrollments[0]?.class.year ?? null,
      })),
    } : null,
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div style={{ marginBottom: 28 }}>
        <BilingualTitle en="Profile" zh="个人资料" />
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          <LanguageText zh="管理您的账号信息和家庭资料" en="Manage your account and family information" />
        </p>
      </div>
      <ProfileClient profile={profile} />
    </div>
  )
}
