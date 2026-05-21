import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!
const adapter = new PrismaPg(dbUrl)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding returning-student test data...\n')

  // ── 1. Backfill nameEn on existing 2025-2026 classes ─────────────────────────
  // The progression logic matches on Class.nameEn, which the original seed left null.

  const nameEnMap: Record<string, string> = {
    'class-toddler-a':      'Toddler Class A',
    'class-toddler-b':      'Toddler Class B',
    'class-beginner-1':     'Beginner Class 1',
    'class-beginner-2':     'Beginner Class 2',
    'class-intermediate-1': 'Intermediate Class 1',
    'class-intermediate-2': 'Intermediate Class 2',
    'class-intermediate-3': 'Intermediate Class 3',
    'class-intermediate-4': 'Intermediate Class 4',
    'class-advanced-1':     'Advanced Class 1',
    'class-advanced-2':     'Advanced Class 2',
    'class-dance':          'Chinese Dance',
    'class-calligraphy':    'Calligraphy',
    'class-painting':       'Chinese Painting',
    'class-erhu':           'Erhu',
    'class-pingpong':       'Table Tennis',
  }

  for (const [id, nameEn] of Object.entries(nameEnMap)) {
    await prisma.class.updateMany({ where: { id }, data: { nameEn } })
  }
  console.log('  ✓ Backfilled nameEn on all 15 existing 2025-2026 classes')

  // ── 2. Create 2024-2025 classes (only the ones we need for test enrollments) ──

  const prev = '2024-2025'

  const prevClasses = [
    {
      id: 'class-2024-beginner-1',
      name: '初级班1 / Beginner Class 1',
      nameEn: 'Beginner Class 1',
      type: 'CHINESE' as const,
      teacherId: 'teacher-wang',
      schedule: { dayOfWeek: 0, startTime: '10:30 AM', endTime: '12:00 PM' },
      capacity: 20,
      fee: 400,
      year: prev,
      description: '适合6–7岁 / Ages 6–7',
    },
    {
      id: 'class-2024-toddler-a',
      name: '幼儿班A / Toddler Class A',
      nameEn: 'Toddler Class A',
      type: 'CHINESE' as const,
      teacherId: 'teacher-wang',
      schedule: { dayOfWeek: 0, startTime: '09:00 AM', endTime: '10:30 AM' },
      capacity: 20,
      fee: 350,
      year: prev,
      description: '适合3–5岁幼儿 / Ages 3–5',
    },
    {
      id: 'class-2024-intermediate-1',
      name: '中级班1 / Intermediate Class 1',
      nameEn: 'Intermediate Class 1',
      type: 'CHINESE' as const,
      teacherId: 'teacher-li',
      schedule: { dayOfWeek: 0, startTime: '01:00 PM', endTime: '02:30 PM' },
      capacity: 20,
      fee: 450,
      year: prev,
      description: '适合8–9岁 / Ages 8–9',
    },
    {
      id: 'class-2024-dance',
      name: '中国舞 / Chinese Dance',
      nameEn: 'Chinese Dance',
      type: 'ARTS' as const,
      teacherId: 'teacher-zhang',
      schedule: { dayOfWeek: 6, startTime: '10:00 AM', endTime: '11:30 AM' },
      capacity: 15,
      fee: 300,
      year: prev,
      description: '中国民族舞蹈 / Chinese folk dance',
    },
    {
      id: 'class-2024-calligraphy',
      name: '书法 / Calligraphy',
      nameEn: 'Calligraphy',
      type: 'ARTS' as const,
      teacherId: 'teacher-chen',
      schedule: { dayOfWeek: 6, startTime: '01:00 PM', endTime: '02:00 PM' },
      capacity: 15,
      fee: 200,
      year: prev,
      description: '中国传统书法 / Traditional Chinese calligraphy',
    },
  ]

  for (const cls of prevClasses) {
    await prisma.class.upsert({
      where: { id: cls.id },
      update: {},
      create: cls,
    })
  }
  console.log(`  ✓ Created ${prevClasses.length} classes for ${prev}`)

  // ── 3. Create CONFIRMED enrollments for 2024-2025 ────────────────────────────
  //
  // Wang Xiaoming (student-xiaoming): Beginner Class 1 + Calligraphy
  //   → next year suggestion: Intermediate Class 1 or 2
  //
  // Wang Xiaohua (student-xiaohua): Toddler Class A + Chinese Dance
  //   → next year suggestion: Beginner Class 1 or 2
  //
  // Zhang Haoran (student-haoran): Intermediate Class 1
  //   → next year suggestion: Intermediate Class 3 or 4

  const enrollments = [
    { id: 'enroll-2024-xiaoming-chinese', studentId: 'student-xiaoming', classId: 'class-2024-beginner-1' },
    { id: 'enroll-2024-xiaoming-arts',    studentId: 'student-xiaoming', classId: 'class-2024-calligraphy' },
    { id: 'enroll-2024-xiaohua-chinese',  studentId: 'student-xiaohua',  classId: 'class-2024-toddler-a' },
    { id: 'enroll-2024-xiaohua-arts',     studentId: 'student-xiaohua',  classId: 'class-2024-dance' },
    { id: 'enroll-2024-haoran-chinese',   studentId: 'student-haoran',   classId: 'class-2024-intermediate-1' },
  ]

  for (const e of enrollments) {
    await prisma.enrollment.upsert({
      where: { studentId_classId: { studentId: e.studentId, classId: e.classId } },
      update: { status: 'CONFIRMED' },
      create: { id: e.id, studentId: e.studentId, classId: e.classId, status: 'CONFIRMED' },
    })
  }
  console.log(`  ✓ Created ${enrollments.length} CONFIRMED enrollments for ${prev}`)

  // ── 4. Summary ────────────────────────────────────────────────────────────────

  const counts = await Promise.all([
    prisma.class.count({ where: { year: prev } }),
    prisma.enrollment.count({ where: { status: 'CONFIRMED', class: { year: prev } } }),
  ])

  console.log('\n✅ Done!\n')
  console.log(`Database now has (${prev}):`)
  console.log(`  Classes:     ${counts[0]}`)
  console.log(`  Enrollments: ${counts[1]} CONFIRMED`)
  console.log('\nReturning students and their progressions:')
  console.log('  王小明 (Wang Xiaoming): Beginner Class 1 + Calligraphy → Intermediate Class 1/2')
  console.log('  王小花 (Wang Xiaohua):  Toddler Class A + Chinese Dance → Beginner Class 1/2')
  console.log('  张浩然 (Zhang Haoran):  Intermediate Class 1 → Intermediate Class 3/4')
  console.log('\nAll 2025-2026 classes now have nameEn set for progression matching.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
