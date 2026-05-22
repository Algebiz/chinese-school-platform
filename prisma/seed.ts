import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!
const adapter = new PrismaPg(dbUrl)
const prisma = new PrismaClient({ adapter })

const LANGUAGE_SCHEDULE = { dayOfWeek: 'Sunday', startTime: '09:00', endTime: '10:50' }
const ARTS_SCHEDULE = { dayOfWeek: 'Sunday', startTime: '11:00', endTime: '12:00' }
const CURRENT_YEAR = '2026-2027'

async function main() {
  console.log('🌱 Seeding database...')

  // ── Delete old classes for the current year (cascade-safe) ──────────────────
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
    {
      id: 'teacher-xueli', name: '薛丽', nameEn: 'Xue Li',
      bioEn: 'Ms. Xue Li teaches AP Chinese at CCA, bringing extensive experience in Chinese language education. She prepares students for the AP Chinese Language and Culture exam with rigorous instruction and deep cultural enrichment.',
      bioZh: '薛丽老师主教AP中文课程，拥有丰富的中文教育经验。她以严格的教学方式和深厚的文化内涵培养学生，帮助他们备战AP中文语言与文化考试。',
    },
    {
      id: 'teacher-xuxiyue', name: '徐希玥', nameEn: 'Xu Xiyue',
      bioEn: 'Ms. Xu Xiyue teaches CHL Level 1A, specializing in early Chinese literacy for young learners. She creates an engaging, nurturing environment to build foundational reading and writing skills.',
      bioZh: '徐希玥老师主教中文母语一班A，专注于低年级学生的中文启蒙教育。她以寓教于乐的方式为学生打好读写基础。',
    },
    {
      id: 'teacher-sunhongyuan', name: '孙宏远', nameEn: 'Sun Hongyuan',
      bioEn: 'Mr. Sun Hongyuan teaches CHL Level 1B, with a passion for inspiring young students to love the Chinese language through interactive lessons and storytelling.',
      bioZh: '孙宏远老师主教中文母语一班B，致力于通过互动教学和故事讲述激发学生对中文的热爱。',
    },
    {
      id: 'teacher-wangfuchao', name: '王伏超', nameEn: 'Wang Fuchao',
      bioEn: 'Mr. Wang Fuchao teaches CHL Level 2, building on students\' foundational skills with a focus on reading comprehension and character recognition.',
      bioZh: '王伏超老师主教中文母语二班，在学生已有基础上进一步强化阅读理解和汉字识别能力。',
    },
    {
      id: 'teacher-cuijing', name: '崔静', nameEn: 'Cui Jing',
      bioEn: 'Ms. Cui Jing teaches CHL Level 3A, helping students transition to more advanced reading and writing with a structured and supportive approach.',
      bioZh: '崔静老师主教中文母语三班A，以有条理、有支持的教学方式引导学生进入更高阶的读写学习。',
    },
    {
      id: 'teacher-shenxianshu', name: '申贤淑', nameEn: 'Shen Xianshu',
      bioEn: 'Ms. Shen Xianshu teaches CHL Level 3B, combining traditional methods with creative activities to strengthen students\' Chinese proficiency.',
      bioZh: '申贤淑老师主教中文母语三班B，将传统教学法与创意活动相结合，全面提升学生的中文能力。',
    },
    {
      id: 'teacher-chaijing', name: '柴静', nameEn: 'Chai Jing',
      bioEn: 'Ms. Chai Jing teaches CHL Level 4A, focusing on essay writing and deeper comprehension skills for intermediate learners.',
      bioZh: '柴静老师主教中文母语四班A，专注于培养中级学生的作文写作与深度理解能力。',
    },
    {
      id: 'teacher-zhangjing', name: '张静', nameEn: 'Zhang Jing',
      bioEn: 'Ms. Zhang Jing teaches CHL Level 4B, engaging students with rich literature and composition practice to develop strong Chinese writing skills.',
      bioZh: '张静老师主教中文母语四班B，通过丰富的文学阅读和写作练习培养学生扎实的中文写作能力。',
    },
    {
      id: 'teacher-mengxiaoying', name: '孟晓莺', nameEn: 'Meng Xiaoying',
      bioEn: 'Ms. Meng Xiaoying teaches CHL Level 4 Intensive, offering accelerated instruction for students who want to advance quickly in Chinese language mastery.',
      bioZh: '孟晓莺老师主教中文母语四班强化班，为希望快速提升中文水平的学生提供强化教学。',
    },
    {
      id: 'teacher-qiangshu', name: '强恕', nameEn: 'Qiang Shu',
      bioEn: 'Mr. Qiang Shu teaches CHL Level 5, guiding students through advanced reading texts and expository writing to prepare for higher-level Chinese.',
      bioZh: '强恕老师主教中文母语五班，指导学生阅读高难度文本并进行说明文写作，为更高年级的中文学习打好基础。',
    },
    {
      id: 'teacher-zhangyongling', name: '张永龄', nameEn: 'Zhang Yongling',
      bioEn: 'Ms. Zhang Yongling teaches CHL Level 6, emphasizing classical Chinese literature and formal writing styles for pre-teen learners.',
      bioZh: '张永龄老师主教中文母语六班，注重古典文学赏析与正式写作风格，为青少年学生奠定深厚的文化底蕴。',
    },
    {
      id: 'teacher-wangluming', name: '王路明', nameEn: 'Wang Luming',
      bioEn: 'Mr. Wang Luming teaches CHL Level 7, developing students\' analytical reading and argumentative writing skills with challenging texts.',
      bioZh: '王路明老师主教中文母语七班，通过富有挑战性的文本培养学生的分析阅读与议论文写作能力。',
    },
    {
      id: 'teacher-wangyan', name: '王燕', nameEn: 'Wang Yan',
      bioEn: 'Ms. Wang Yan teaches CHL Level 8, preparing advanced students for high-school-level Chinese with rigorous literary study and composition.',
      bioZh: '王燕老师主教中文母语八班，以严格的文学学习和写作训练为高阶学生备战高中中文课程。',
    },
    {
      id: 'teacher-wangqian', name: '汪倩', nameEn: 'Wang Qian',
      bioEn: 'Ms. Wang Qian teaches both CHL Level 9 and Art Class. She brings a unique blend of Chinese language expertise and artistic creativity, inspiring students to explore Chinese culture through language and visual arts.',
      bioZh: '汪倩老师同时执教中文母语九班与美术班，将中文语言教学与艺术创作融为一体，引导学生通过语言与视觉艺术探索中国文化。',
    },
    {
      id: 'teacher-chengxuling', name: '程旭灵', nameEn: 'Cheng Xuling',
      bioEn: 'Ms. Cheng Xuling teaches CHL Level 9 Intensive, offering accelerated advanced instruction for students preparing for AP Chinese or heritage language certification.',
      bioZh: '程旭灵老师主教中文母语九班强化班，为备战AP中文考试或传承语言认证的学生提供高阶强化课程。',
    },
    {
      id: 'teacher-zengwenchan', name: '曾雯婵', nameEn: 'Zeng Wenchan',
      bioEn: 'Ms. Zeng Wenchan teaches CSL Level 1A, welcoming young beginners to Mandarin as a second language through songs, games, and hands-on activities.',
      bioZh: '曾雯婵老师主教中文第二语言一班A，通过歌谣、游戏和动手活动引导小学生快乐入门普通话。',
    },
    {
      id: 'teacher-chenxiahuan', name: '陈夏欢', nameEn: 'Chen Xiahuan',
      bioEn: 'Ms. Chen Xiahuan teaches CSL Level 1B, creating a fun and immersive learning environment for young beginners discovering Mandarin for the first time.',
      bioZh: '陈夏欢老师主教中文第二语言一班B，为初次接触普通话的小学生营造轻松沉浸式的学习氛围。',
    },
    {
      id: 'teacher-limeili', name: '李美丽', nameEn: 'Li Meili',
      bioEn: 'Ms. Li Meili teaches CSL Level 2, building on beginner vocabulary and conversation skills with engaging real-life topics and cultural themes.',
      bioZh: '李美丽老师主教中文第二语言二班，以贴近生活的话题和文化主题为基础，帮助学生扩展词汇并提升会话能力。',
    },
    {
      id: 'teacher-zhongying', name: '钟莹', nameEn: 'Zhong Ying',
      bioEn: 'Ms. Zhong Ying teaches CSL Level 3, guiding intermediate second-language learners toward greater fluency through reading, writing, and conversational practice.',
      bioZh: '钟莹老师主教中文第二语言三班，通过读写与口语练习引导中级学生进一步提升普通话流利度。',
    },
  ]

  const teachers = await Promise.all(
    teacherDefs.map((t) =>
      prisma.teacher.upsert({
        where: { id: t.id },
        update: { name: t.name, nameEn: t.nameEn, bioEn: t.bioEn, bioZh: t.bioZh },
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
  const artsDefs = [
    {
      id: 'teacher-jonathan', name: 'Jonathan', nameEn: 'Jonathan',
      bioEn: 'Jonathan is a seasoned instructor in Chinese martial arts and lion dance performance. He has trained performers across the region and brings infectious energy and discipline to every class.',
      bioZh: 'Jonathan是一位经验丰富的中国武术与舞狮表演指导教师，曾培训全国各地的表演者，将活力与自律带入每一堂课。',
    },
    {
      id: 'teacher-seanpeeler', name: 'Sean Peeler', nameEn: 'Sean Peeler',
      bioEn: 'Sean Peeler is a competitive chess coach with years of experience developing junior players. He focuses on strategic thinking, patience, and the joy of the game.',
      bioZh: 'Sean Peeler是一位资深青少年国际象棋教练，专注于培养学生的战略思维、耐心与对棋局的热爱。',
    },
    {
      id: 'teacher-tbd-dance', name: 'TBD Teacher Dance', nameEn: null,
      bioEn: 'Teacher information coming soon. This class covers classical and folk Chinese dance for all skill levels.',
      bioZh: '教师信息敬请期待。本课程涵盖古典舞与民族舞，适合各程度学生。',
    },
    {
      id: 'teacher-tbd-math', name: 'TBD Teacher Math', nameEn: null,
      bioEn: 'Teacher information coming soon. This class offers math enrichment to strengthen problem-solving and analytical skills.',
      bioZh: '教师信息敬请期待。本课程为数学强化班，旨在提升学生的解题思维与分析能力。',
    },
  ]
  const [tJonathan, tSeanPeeler, tTbdDance, tTbdMath] = await Promise.all(
    artsDefs.map((t) =>
      prisma.teacher.upsert({
        where: { id: t.id },
        update: { name: t.name, nameEn: t.nameEn, bioEn: t.bioEn, bioZh: t.bioZh },
        create: t,
      })
    )
  )

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

  // ── AcademicYearConfig ───────────────────────────────────────────────────────
  await prisma.academicYearConfig.updateMany({ data: { isActive: false } })
  await prisma.academicYearConfig.upsert({
    where: { academicYear: CURRENT_YEAR },
    update: { isActive: true, nextYear: '2027-2028' },
    create: {
      academicYear: CURRENT_YEAR,
      nextYear: '2027-2028',
      isActive: true,
      reEnrollmentOpenDate: new Date('2026-03-01'),
      newEnrollmentOpenDate: new Date('2026-04-01'),
    },
  })
  console.log('  ✓ AcademicYearConfig set to', CURRENT_YEAR)

  // ── Sample textbooks ──────────────────────────────────────────────────────────
  const sampleTextbooks = [
    {
      id: 'textbook-chl3a-book',
      classId: 'chl-3a',
      name: 'CHL Level 3A Textbook',
      nameZh: '三班A课本',
      description: 'Main textbook for CHL Level 3A',
      price: 25.00,
    },
    {
      id: 'textbook-chl3a-workbook',
      classId: 'chl-3a',
      name: 'CHL Level 3A Workbook',
      nameZh: '三班A练习册',
      description: 'Workbook for CHL Level 3A',
      price: 15.00,
    },
    {
      id: 'textbook-csl1a-book',
      classId: 'csl-1a',
      name: 'CSL Level 1A Textbook',
      nameZh: 'CSL一班A课本',
      description: 'Main textbook for CSL Level 1A',
      price: 20.00,
    },
  ]

  for (const tb of sampleTextbooks) {
    await prisma.textbook.upsert({
      where: { id: tb.id },
      update: { name: tb.name, nameZh: tb.nameZh, price: tb.price },
      create: { ...tb, isActive: true },
    })
  }

  console.log('  ✓ Sample textbooks created (3)')

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

  // ── Exam Sessions ─────────────────────────────────────────────────────────────
  const EXAM_LOCATION_EN = 'Charlotte Chinese Academy — Room 101'
  const EXAM_LOCATION_ZH = '夏洛特中文学校 — 101教室'

  const examSessions = [
    {
      id: 'exam-yct-3',
      examType: 'YCT' as const,
      level: 3,
      examDate: new Date('2027-04-15T09:00:00'),
      registrationDeadline: new Date('2027-03-31T23:59:59'),
      location: EXAM_LOCATION_EN,
      locationZh: EXAM_LOCATION_ZH,
      fee: 25,
      capacity: 30,
      academicYear: CURRENT_YEAR,
      isActive: true,
    },
    {
      id: 'exam-yct-4',
      examType: 'YCT' as const,
      level: 4,
      examDate: new Date('2027-04-15T11:00:00'),
      registrationDeadline: new Date('2027-03-31T23:59:59'),
      location: EXAM_LOCATION_EN,
      locationZh: EXAM_LOCATION_ZH,
      fee: 25,
      capacity: 30,
      academicYear: CURRENT_YEAR,
      isActive: true,
    },
    {
      id: 'exam-hsk-2',
      examType: 'HSK' as const,
      level: 2,
      examDate: new Date('2027-04-20T09:00:00'),
      registrationDeadline: new Date('2027-04-05T23:59:59'),
      location: EXAM_LOCATION_EN,
      locationZh: EXAM_LOCATION_ZH,
      fee: 30,
      capacity: 20,
      academicYear: CURRENT_YEAR,
      isActive: true,
    },
    {
      id: 'exam-hsk-3',
      examType: 'HSK' as const,
      level: 3,
      examDate: new Date('2027-04-20T11:00:00'),
      registrationDeadline: new Date('2027-04-05T23:59:59'),
      location: EXAM_LOCATION_EN,
      locationZh: EXAM_LOCATION_ZH,
      fee: 35,
      capacity: 20,
      academicYear: CURRENT_YEAR,
      isActive: true,
    },
  ]

  for (const es of examSessions) {
    await prisma.examSession.upsert({
      where: { id: es.id },
      update: { fee: es.fee, capacity: es.capacity, isActive: es.isActive },
      create: es,
    })
  }

  console.log('  ✓ Exam sessions created (YCT L3, YCT L4, HSK L2, HSK L3)')

  console.log('\n✅ Seeding complete!')
  console.log('\nSummary:')
  console.log('  Teachers:          19 (language) + 4 (arts) + 汪倩 (shared) = 23')
  console.log('  Sample textbooks:  CHL 3A (×2), CSL 1A (×1)')
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
