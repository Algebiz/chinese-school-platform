import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('\n🔍 CCA Database Safety Check')
  console.log('='.repeat(40))

  const [
    users, families, students,
    enrollments, classes, cartItems,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.family.count(),
    prisma.student.count(),
    prisma.enrollment.count(),
    prisma.class.count(),
    prisma.cartItem.count(),
  ])

  const checks = [
    {
      name: 'Users exist',
      pass: users > 0,
      value: users,
      warning: users < 5 ? '⚠️  Very few users — is this production?' : null,
    },
    {
      name: 'Families exist',
      pass: families > 0,
      value: families,
      warning: families < 5 ? '⚠️  Very few families' : null,
    },
    {
      name: 'Students exist',
      pass: students > 0,
      value: students,
      warning: students < 10 ? '⚠️  Very few students — migration may not have run' : null,
    },
    {
      name: 'Classes exist',
      pass: classes > 0,
      value: classes,
      warning: classes < 5 ? '⚠️  Very few classes' : null,
    },
    {
      name: 'Enrollments exist',
      pass: enrollments > 0,
      value: enrollments,
      warning: enrollments < 10 ? '⚠️  Very few enrollments' : null,
    },
  ]

  let allPassed = true
  for (const check of checks) {
    const icon = check.pass ? '✅' : '❌'
    console.log(`${icon} ${check.name}: ${check.value}`)
    if (check.warning) console.log(`   ${check.warning}`)
    if (!check.pass) allPassed = false
  }

  // Warn if families are mid-checkout
  if (cartItems > 0) {
    console.log(`\n⚠️  WARNING: ${cartItems} items in cart`)
    console.log('   Families may be mid-checkout — avoid migrations now')
  }

  // Check active academic year config
  const yearConfig = await prisma.academicYearConfig.findFirst({
    where: { isActive: true },
  })
  if (yearConfig) {
    console.log(`\n📅 Active academic year: ${yearConfig.academicYear}`)
  } else {
    console.log('\n❌ No active academic year config found!')
    allPassed = false
  }

  console.log('\n' + '='.repeat(40))
  if (allPassed) {
    console.log('✅ All checks passed — safe to proceed')
  } else {
    console.log('❌ Some checks failed — review before proceeding')
    process.exit(1)
  }

  await prisma.$disconnect()
}

main().catch(console.error)
