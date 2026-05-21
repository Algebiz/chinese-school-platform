import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const email = process.argv[2]
if (!email) {
  console.error('Usage: npx tsx prisma/promote-super-admin.ts <email>')
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DIRECT_URL || process.env.DATABASE_URL!),
})

async function main() {
  const user = await prisma.user.update({
    where: { email },
    data: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, name: true, role: true },
  })
  console.log(`✅ ${user.email} (${user.name ?? 'no name'}) → SUPER_ADMIN`)
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
