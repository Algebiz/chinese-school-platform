import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!
const adapter = new PrismaPg(dbUrl)
const prisma = new PrismaClient({ adapter })

const LANGUAGE_SCHEDULE = { dayOfWeek: 'Sunday', startTime: '09:00', endTime: '10:50' }
const ARTS_SCHEDULE = { dayOfWeek: 'Sunday', startTime: '11:00', endTime: '12:00' }
const CURRENT_YEAR = '2025-2026'

async function main() {
  console.log('🌱 Seeding database...')

  // ── Delete old 2025-2026 classes (cascade-safe) ──────────────────────────────
  console.log('  🗑️  Removing old placeholder classes...')
  const oldClasses = await prisma.class.findMany({
    where: { year: CURRENT_YEAR },
    select: { id: true },
  })
  const oldClassIds = oldClasses.map((c) => c.id)

  if (oldClassIds.length > 0) {
    await prisma.studentNextClassOverride.deleteMany({ where: { classId: { in: oldClassIds } } })
    await prisma.waitlist.deleteMany({ where: { classId: { in: oldClassIds } } })
    const oldEnrollments = await prisma.enrollment.findMany({
      where: { classId: { in: oldClassIds } },
      select: { id: true },
    })
    if (oldEnrollments.length > 0) {
      await prisma.payment.deleteMany({ where: { enrollmentId: { in: oldEnrollments.map((e) => e.id) } } })
      await prisma.enrollment.deleteMany({ where: { classId: { in: oldClassIds } } })
    }
    await prisma.class.deleteMany({ where: { id: { in: oldClassIds } } })
  }

  // Delete old placeholder teachers
  await prisma.teacher.deleteMany({
    where: { id: { in: ['teacher-wang', 'teacher-li', 'teacher-zhang', 'teacher-chen', 'teacher-liu'] } },
  })

  console.log('  ✓ Old data removed')


  // ── Real CCA teachers (19) ───────────────────────────────────────────────────
  const teacherDefs = [
    { id: 'teacher-xueli',        name: '薛丽 (Xue Li)' },
    { id: 'teacher-xuxiyue',      name: '徐希玥 (Xu Xiyue)' },
    { id: 'teacher-sunhongyuan',  name: '孙宏远 (Sun Hongyuan)' },
    { id: 'teacher-wangfuchao',   name: '王伏超 (Wang Fuchao)' },
    { id: 'teacher-cuijing',      name: '崔静 (Cui Jing)' },
    { id: 'teacher-shenxianshu',  name: '申贤淑 (Shen Xianshu)' },
    { id: 'teacher-chaijing',     name: '柴静 (Chai Jing)' },
    { id: 'teacher-zhangjing',    name: '张静 (Zhang Jing)' },
    { id: 'teacher-mengxiaoying', name: '孟晓莺 (Meng Xiaoying)' },
    { id: 'teacher-qiangshu',     name: '强恕 (Qiang Shu)' },
    { id: 'teacher-zhangyongling',name: '张永龄 (Zhang Yongling)' },
    { id: 'teacher-wangluming',   name: '王路明 (Wang Luming)' },
    { id: 'teacher-wangyan',      name: '王燕 (Wang Yan)' },
    { id: 'teacher-wangqian',     name: '汪倩 (Wang Qian)' },
    { id: 'teacher-chengxuling',  name: '程旭灵 (Cheng Xuling)' },
    { id: 'teacher-zengwenchan',  name: '曾雯婵 (Zeng Wenchan)' },
    { id: 'teacher-chenxiahuan',  name: '陈夏欢 (Chen Xiahuan)' },
    { id: 'teacher-limeili',      name: '李美丽 (Li Meili)' },
    { id: 'teacher-zhongying',    name: '钟莹 (Zhong Ying)' },
  ]

  const teachers = await Promise.all(
    teacherDefs.map((t) =>
      prisma.teacher.upsert({
        where: { id: t.id },
        update: { name: t.name },
        create: t,
      })
    )
  )

  const [
    tXueLi, tXuXiyue, tSunHongyuan, tWangFuchao, tCuiJing,
    tShenXianshu, tChaiJing, tZhangJing, tMengXiaoying, tQiangShu,
    tZhangYongling, tWangLuming, tWangYan, tWangQian, tChengXuling,
    tZengWenchan, tChenXiahuan, tLiMeili, tZhongYing,
  ] = teachers

  console.log('  ✓ Language teachers created (19)')

  // ── Arts teachers ────────────────────────────────────────────────────────────
  const [tJonathan, tSeanPeeler, tTbdDance, tTbdMath] = await Promise.all([
    prisma.teacher.upsert({
      where: { id: 'teacher-jonathan' },
      update: { name: 'Jonathan' },
      create: { id: 'teacher-jonathan', name: 'Jonathan' },
    }),
    prisma.teacher.upsert({
      where: { id: 'teacher-seanpeeler' },
      update: { name: 'Sean Peeler' },
      create: { id: 'teacher-seanpeeler', name: 'Sean Peeler' },
    }),
    prisma.teacher.upsert({
      where: { id: 'teacher-tbd-dance' },
      update: { name: 'TBD Teacher Dance' },
      create: { id: 'teacher-tbd-dance', name: 'TBD Teacher Dance' },
    }),
    prisma.teacher.upsert({
      where: { id: 'teacher-tbd-math' },
      update: { name: 'TBD Teacher Math' },
      create: { id: 'teacher-tbd-math', name: 'TBD Teacher Math' },
    }),
  ])

  console.log('  ✓ Arts teachers created (4 new + 汪倩 reused)')

  // ── CHL Language Classes (15) ────────────────────────────────────────────────
  const chlClasses = [
    {
      id: 'chl-1a',
      name: '中文母语一班A',
      nameEn: 'CHL Level 1A',
      teacherId: tXuXiyue.id,
      description: 'Ages 6–7',
    },
    {
      id: 'chl-1b',
      name: '中文母语一班B',
      nameEn: 'CHL Level 1B',
      teacherId: tSunHongyuan.id,
      description: 'Ages 6–7',
    },
    {
      id: 'chl-2',
      name: '中文母语二班',
      nameEn: 'CHL Level 2',
      teacherId: tWangFuchao.id,
      description: 'Ages 7–8',
    },
    {
      id: 'chl-3a',
      name: '中文母语三班A',
      nameEn: 'CHL Level 3A',
      teacherId: tCuiJing.id,
      description: 'Ages 8–9',
    },
    {
      id: 'chl-3b',
      name: '中文母语三班B',
      nameEn: 'CHL Level 3B',
      teacherId: tShenXianshu.id,
      description: 'Ages 8–9',
    },
    {
      id: 'chl-4a',
      name: '中文母语四班A',
      nameEn: 'CHL Level 4A',
      teacherId: tChaiJing.id,
      description: 'Ages 9–10',
    },
    {
      id: 'chl-4b',
      name: '中文母语四班B',
      nameEn: 'CHL Level 4B',
      teacherId: tZhangJing.id,
      description: 'Ages 9–10',
    },
    {
      id: 'chl-4-intensive',
      name: '中文母语四班强化班',
      nameEn: 'CHL Level 4 Intensive',
      teacherId: tMengXiaoying.id,
      description: 'Ages 9–10',
    },
    {
      id: 'chl-5',
      name: '中文母语五班',
      nameEn: 'CHL Level 5',
      teacherId: tQiangShu.id,
      description: 'Ages 10–11',
    },
    {
      id: 'chl-6',
      name: '中文母语六班',
      nameEn: 'CHL Level 6',
      teacherId: tZhangYongling.id,
      description: 'Ages 11–12',
    },
    {
      id: 'chl-7',
      name: '中文母语七班',
      nameEn: 'CHL Level 7',
      teacherId: tWangLuming.id,
      description: 'Ages 12–13',
    },
    {
      id: 'chl-8',
      name: '中文母语八班',
      nameEn: 'CHL Level 8',
      teacherId: tWangYan.id,
      description: 'Ages 13–14',
    },
    {
      id: 'chl-9',
      name: '中文母语九班',
      nameEn: 'CHL Level 9',
      teacherId: tWangQian.id,
      description: 'Ages 14–16',
    },
    {
      id: 'chl-9-intensive',
      name: '中文母语九班强化班',
      nameEn: 'CHL Level 9 Intensive',
      teacherId: tChengXuling.id,
      description: 'Ages 14–16',
    },
    {
      id: 'chl-ap',
      name: 'AP中文',
      nameEn: 'AP Chinese',
      teacherId: tXueLi.id,
      description: 'Ages 15–18',
    },
  ]

  for (const cls of chlClasses) {
    await prisma.class.upsert({
      where: { id: cls.id },
      update: { name: cls.name, nameEn: cls.nameEn, teacherId: cls.teacherId, description: cls.description },
      create: {
        ...cls,
        type: 'CHINESE',
        schedule: LANGUAGE_SCHEDULE,
        capacity: 20,
        fee: 500,
        year: CURRENT_YEAR,
      },
    })
  }

  console.log('  ✓ CHL language classes created (15)')

  // ── CSL Language Classes (4) ─────────────────────────────────────────────────
  const cslClasses = [
    {
      id: 'csl-1a',
      name: '中文第二语言一班A',
      nameEn: 'CSL Level 1A',
      teacherId: tZengWenchan.id,
      description: 'Ages 5–8',
    },
    {
      id: 'csl-1b',
      name: '中文第二语言一班B',
      nameEn: 'CSL Level 1B',
      teacherId: tChenXiahuan.id,
      description: 'Ages 5–8',
    },
    {
      id: 'csl-2',
      name: '中文第二语言二班',
      nameEn: 'CSL Level 2',
      teacherId: tLiMeili.id,
      description: 'Ages 8–12',
    },
    {
      id: 'csl-3',
      name: '中文第二语言三班',
      nameEn: 'CSL Level 3',
      teacherId: tZhongYing.id,
      description: 'Ages 10–14',
    },
  ]

  for (const cls of cslClasses) {
    await prisma.class.upsert({
      where: { id: cls.id },
      update: { name: cls.name, nameEn: cls.nameEn, teacherId: cls.teacherId, description: cls.description },
      create: {
        ...cls,
        type: 'CHINESE',
        schedule: LANGUAGE_SCHEDULE,
        capacity: 20,
        fee: 500,
        year: CURRENT_YEAR,
      },
    })
  }

  console.log('  ✓ CSL language classes created (4)')

  // ── Arts Classes (5) ─────────────────────────────────────────────────────────
  // 汪倩 (tWangQian) is reused from the language teachers array (index 13)
  const artsClasses = [
    {
      id: 'arts-liondance',
      name: '舞狮与功夫',
      nameEn: 'Lion Dance & Kung Fu',
      teacherId: tJonathan.id,
      description: 'Traditional Chinese lion dance and kung fu — performance and discipline combined / 传统中国舞狮与功夫表演——艺术与武术的完美结合',
    },
    {
      id: 'arts-traditionaldance',
      name: '中国传统舞蹈',
      nameEn: 'Chinese Traditional Dance',
      teacherId: tTbdDance.id,
      description: 'Classical and folk Chinese dance for all levels / 古典舞与民族舞兼修，适合各年龄段学生',
    },
    {
      id: 'arts-chess',
      name: '国际象棋',
      nameEn: 'Chess',
      teacherId: tSeanPeeler.id,
      description: 'Chess strategy and competition for beginners to intermediate players / 国际象棋策略与比赛，适合初学至中级学生',
    },
    {
      id: 'arts-math',
      name: '数学',
      nameEn: 'Math',
      teacherId: tTbdMath.id,
      description: 'Math enrichment program to strengthen problem-solving skills / 数学强化课程，培养解题思维与数学能力',
    },
    {
      id: 'arts-artclass',
      name: '美术班',
      nameEn: 'Art Class',
      teacherId: tWangQian.id,
      description: 'Chinese art and creative expression / 中国美术与创意表达',
    },
  ]

  for (const cls of artsClasses) {
    await prisma.class.upsert({
      where: { id: cls.id },
      update: { name: cls.name, nameEn: cls.nameEn, teacherId: cls.teacherId, description: cls.description },
      create: {
        ...cls,
        type: 'ARTS',
        schedule: ARTS_SCHEDULE,
        capacity: 15,
        fee: 200,
        year: CURRENT_YEAR,
      },
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

  console.log('  ✓ Admin account (admin@chineseschool.com / Admin123!)')

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

  console.log('  ✓ Parent 1 (parent1@test.com / Test123!) with 2 students')

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

  console.log('  ✓ Parent 2 (parent2@test.com / Test123!) with 1 student')

  console.log('\n✅ Seeding complete!')
  console.log('\nSummary:')
  console.log('  Teachers:          19 (language) + 4 (arts) + 汪倩 (shared) = 23')
  console.log('  CHL language:      15')
  console.log('  CSL language:       4')
  console.log('  Total language:    19')
  console.log('  Arts classes:       5')
  console.log('  Admin:             admin@chineseschool.com / Admin123!')
  console.log('  Test parents:      parent1@test.com, parent2@test.com / Test123!')
  console.log('  Test students:     Wang Xiaoming, Wang Xiaohua, Zhang Haoran')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
