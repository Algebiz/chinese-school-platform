import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!
const adapter = new PrismaPg(dbUrl)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // ── Teachers ────────────────────────────────────────────────────────────────
  const [tWang, tLi, tZhang, tChen, tLiu] = await Promise.all([
    prisma.teacher.upsert({
      where: { id: 'teacher-wang' },
      update: {},
      create: { id: 'teacher-wang', name: '王老师 / Teacher Wang' },
    }),
    prisma.teacher.upsert({
      where: { id: 'teacher-li' },
      update: {},
      create: { id: 'teacher-li', name: '李老师 / Teacher Li' },
    }),
    prisma.teacher.upsert({
      where: { id: 'teacher-zhang' },
      update: {},
      create: { id: 'teacher-zhang', name: '张老师 / Teacher Zhang' },
    }),
    prisma.teacher.upsert({
      where: { id: 'teacher-chen' },
      update: {},
      create: { id: 'teacher-chen', name: '陈老师 / Teacher Chen' },
    }),
    prisma.teacher.upsert({
      where: { id: 'teacher-liu' },
      update: {},
      create: { id: 'teacher-liu', name: '刘老师 / Teacher Liu' },
    }),
  ])

  console.log('  ✓ Teachers created')

  // ── Chinese Classes ──────────────────────────────────────────────────────────
  const chineseClasses = [
    {
      id: 'class-toddler-a',
      name: '幼儿班A / Toddler Class A',
      type: 'CHINESE' as const,
      teacherId: tWang.id,
      schedule: [{ dayOfWeek: 0, startTime: '09:00', endTime: '10:30' }],
      capacity: 20,
      fee: 350,
      year: '2025-2026',
      description: '适合3–5岁幼儿 / Ages 3–5',
    },
    {
      id: 'class-toddler-b',
      name: '幼儿班B / Toddler Class B',
      type: 'CHINESE' as const,
      teacherId: tLi.id,
      schedule: [{ dayOfWeek: 0, startTime: '09:00', endTime: '10:30' }],
      capacity: 20,
      fee: 350,
      year: '2025-2026',
      description: '适合3–5岁幼儿 / Ages 3–5',
    },
    {
      id: 'class-beginner-1',
      name: '初级班1 / Beginner Class 1',
      type: 'CHINESE' as const,
      teacherId: tWang.id,
      schedule: [{ dayOfWeek: 0, startTime: '10:30', endTime: '12:00' }],
      capacity: 20,
      fee: 400,
      year: '2025-2026',
      description: '适合6–7岁 / Ages 6–7',
    },
    {
      id: 'class-beginner-2',
      name: '初级班2 / Beginner Class 2',
      type: 'CHINESE' as const,
      teacherId: tLi.id,
      schedule: [{ dayOfWeek: 0, startTime: '10:30', endTime: '12:00' }],
      capacity: 20,
      fee: 400,
      year: '2025-2026',
      description: '适合6–7岁 / Ages 6–7',
    },
    {
      id: 'class-intermediate-1',
      name: '中级班1 / Intermediate Class 1',
      type: 'CHINESE' as const,
      teacherId: tWang.id,
      schedule: [{ dayOfWeek: 0, startTime: '13:00', endTime: '14:30' }],
      capacity: 20,
      fee: 450,
      year: '2025-2026',
      description: '适合8–9岁 / Ages 8–9',
    },
    {
      id: 'class-intermediate-2',
      name: '中级班2 / Intermediate Class 2',
      type: 'CHINESE' as const,
      teacherId: tLi.id,
      schedule: [{ dayOfWeek: 0, startTime: '13:00', endTime: '14:30' }],
      capacity: 20,
      fee: 450,
      year: '2025-2026',
      description: '适合8–9岁 / Ages 8–9',
    },
    {
      id: 'class-intermediate-3',
      name: '中级班3 / Intermediate Class 3',
      type: 'CHINESE' as const,
      teacherId: tWang.id,
      schedule: [{ dayOfWeek: 0, startTime: '14:30', endTime: '16:00' }],
      capacity: 20,
      fee: 450,
      year: '2025-2026',
      description: '适合10–11岁 / Ages 10–11',
    },
    {
      id: 'class-intermediate-4',
      name: '中级班4 / Intermediate Class 4',
      type: 'CHINESE' as const,
      teacherId: tLi.id,
      schedule: [{ dayOfWeek: 0, startTime: '14:30', endTime: '16:00' }],
      capacity: 20,
      fee: 450,
      year: '2025-2026',
      description: '适合10–11岁 / Ages 10–11',
    },
    {
      id: 'class-advanced-1',
      name: '高级班1 / Advanced Class 1',
      type: 'CHINESE' as const,
      teacherId: tWang.id,
      schedule: [{ dayOfWeek: 0, startTime: '09:00', endTime: '12:00' }],
      capacity: 20,
      fee: 500,
      year: '2025-2026',
      description: '适合12岁以上 / Ages 12+',
    },
    {
      id: 'class-advanced-2',
      name: '高级班2 / Advanced Class 2',
      type: 'CHINESE' as const,
      teacherId: tLi.id,
      schedule: [{ dayOfWeek: 0, startTime: '09:00', endTime: '12:00' }],
      capacity: 20,
      fee: 500,
      year: '2025-2026',
      description: '适合12岁以上 / Ages 12+',
    },
  ]

  for (const cls of chineseClasses) {
    await prisma.class.upsert({
      where: { id: cls.id },
      update: {},
      create: cls,
    })
  }

  console.log('  ✓ Chinese classes created (10)')

  // ── Arts Classes ─────────────────────────────────────────────────────────────
  const artsClasses = [
    {
      id: 'class-dance',
      name: '中国舞 / Chinese Dance',
      type: 'ARTS' as const,
      teacherId: tZhang.id,
      schedule: [{ dayOfWeek: 6, startTime: '10:00', endTime: '11:30' }],
      capacity: 15,
      fee: 300,
      year: '2025-2026',
      description: '中国民族舞蹈 / Chinese folk dance',
    },
    {
      id: 'class-calligraphy',
      name: '书法 / Calligraphy',
      type: 'ARTS' as const,
      teacherId: tChen.id,
      schedule: [{ dayOfWeek: 6, startTime: '13:00', endTime: '14:00' }],
      capacity: 15,
      fee: 200,
      year: '2025-2026',
      description: '中国传统书法 / Traditional Chinese calligraphy',
    },
    {
      id: 'class-painting',
      name: '国画 / Chinese Painting',
      type: 'ARTS' as const,
      teacherId: tChen.id,
      schedule: [{ dayOfWeek: 6, startTime: '14:00', endTime: '15:30' }],
      capacity: 12,
      fee: 250,
      year: '2025-2026',
      description: '中国水墨画 / Chinese ink painting',
    },
    {
      id: 'class-erhu',
      name: '二胡 / Erhu',
      type: 'ARTS' as const,
      teacherId: tLiu.id,
      schedule: [{ dayOfWeek: 6, startTime: '10:00', endTime: '11:00' }],
      capacity: 10,
      fee: 280,
      year: '2025-2026',
      description: '中国二胡（中国小提琴）/ Chinese violin',
    },
    {
      id: 'class-pingpong',
      name: '乒乓球 / Table Tennis',
      type: 'ARTS' as const,
      teacherId: tLiu.id,
      schedule: [{ dayOfWeek: 6, startTime: '11:00', endTime: '12:30' }],
      capacity: 20,
      fee: 200,
      year: '2025-2026',
      description: '乒乓球训练 / Table tennis training',
    },
  ]

  for (const cls of artsClasses) {
    await prisma.class.upsert({
      where: { id: cls.id },
      update: {},
      create: cls,
    })
  }

  console.log('  ✓ Arts classes created (5)')

  // ── Admin account ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@chineseschool.com' },
    update: {},
    create: {
      email: 'admin@chineseschool.com',
      name: 'Admin',
      password: adminHash,
      role: 'SUPER_ADMIN',
    },
  })

  console.log('  ✓ Admin account created (admin@chineseschool.com / Admin123!)')

  // ── Parent 1: David Wang ─────────────────────────────────────────────────────
  const parent1Hash = await bcrypt.hash('Test123!', 12)
  const family1 = await prisma.family.upsert({
    where: { id: 'family-wang' },
    update: {},
    create: { id: 'family-wang', phone: '555-0101' },
  })

  await prisma.user.upsert({
    where: { email: 'parent1@test.com' },
    update: {},
    create: {
      email: 'parent1@test.com',
      name: 'David Wang',
      password: parent1Hash,
      role: 'PARENT',
      phone: '555-0101',
      familyId: family1.id,
    },
  })

  await prisma.student.upsert({
    where: { id: 'student-xiaoming' },
    update: {},
    create: {
      id: 'student-xiaoming',
      name: '王小明',
      nameEn: 'Wang Xiaoming',
      birthDate: new Date('2016-03-15'),
      familyId: family1.id,
    },
  })

  await prisma.student.upsert({
    where: { id: 'student-xiaohua' },
    update: {},
    create: {
      id: 'student-xiaohua',
      name: '王小花',
      nameEn: 'Wang Xiaohua',
      birthDate: new Date('2018-07-20'),
      familyId: family1.id,
    },
  })

  console.log('  ✓ Parent 1 created (parent1@test.com / Test123!) with 2 students')

  // ── Parent 2: Mei Zhang ──────────────────────────────────────────────────────
  const parent2Hash = await bcrypt.hash('Test123!', 12)
  const family2 = await prisma.family.upsert({
    where: { id: 'family-zhang' },
    update: {},
    create: { id: 'family-zhang', phone: '555-0202' },
  })

  await prisma.user.upsert({
    where: { email: 'parent2@test.com' },
    update: {},
    create: {
      email: 'parent2@test.com',
      name: 'Mei Zhang',
      password: parent2Hash,
      role: 'PARENT',
      phone: '555-0202',
      familyId: family2.id,
    },
  })

  await prisma.student.upsert({
    where: { id: 'student-haoran' },
    update: {},
    create: {
      id: 'student-haoran',
      name: '张浩然',
      nameEn: 'Zhang Haoran',
      birthDate: new Date('2015-09-10'),
      familyId: family2.id,
    },
  })

  console.log('  ✓ Parent 2 created (parent2@test.com / Test123!) with 1 student')

  console.log('\n✅ Seeding complete!')
  console.log('\nSummary:')
  console.log('  Teachers:       5')
  console.log('  Chinese classes: 10')
  console.log('  Arts classes:    5')
  console.log('  Admin account:   admin@chineseschool.com')
  console.log('  Parent accounts: parent1@test.com, parent2@test.com')
  console.log('  Students:        Wang Xiaoming, Wang Xiaohua, Zhang Haoran')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
