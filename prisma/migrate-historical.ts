import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import * as fs from 'fs'
import { parse } from 'csv-parse/sync'
import * as bcrypt from 'bcryptjs'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })
const DRY_RUN = process.env.DRY_RUN === 'true'

console.log('\n' + '='.repeat(60))
console.log('CCA Historical Data Migration')
console.log('Scope: 2020-2021 through 2025-2026')
console.log('Skip: 2018-2019, 2019-2020 (Summer Camp only)')
console.log('Skip: 2026-2027 (use platform enrollment)')
console.log(DRY_RUN ? '🔍 DRY RUN — no data written' : '🚀 LIVE RUN — writing to database')
console.log('='.repeat(60))

// ── FILES ─────────────────────────────────────────────────────
const FILES = [
  { path: 'uploads/2020-2021.csv', year: '2020-2021' },
  { path: 'uploads/2021-2022.csv', year: '2021-2022' },
  { path: 'uploads/2022-2023.csv', year: '2022-2023' },
  { path: 'uploads/2023-2024.csv', year: '2023-2024' },
  { path: 'uploads/2024-2025.csv', year: '2024-2025' },
  { path: 'uploads/2025-2026.csv', year: '2025-2026' },
]

// ── CLASS MAP ──────────────────────────────────────────────────
const CLASS_MAP: Record<string, string | null> = {
  'CHL01': 'CHL Level 1',
  'CHL02': 'CHL Level 2',
  'CHL03': 'CHL Level 3',
  'CHL04': 'CHL Level 4',
  'CHL05': 'CHL Level 5',
  'CHL06': 'CHL Level 6',
  'CHL07': 'CHL Level 7',
  'CHL08': 'CHL Level 8',
  'CHL09': 'CHL Level 9',
  'CHL10': 'CHL Level 10',
  'AP':    'AP Chinese',

  'CSL01':   'CSL Level 1',
  'CSL01_A': 'CSL Level 1',
  'CSL01_B': 'CSL Level 1',
  'CSL02':   'CSL Level 2',
  'CSL02_A': 'CSL Level 2',
  'CSL02_B': 'CSL Level 2',
  'CSL03':   'CSL Level 3',
  'CSL03_A': 'CSL Level 3',
  'CSL03_B': 'CSL Level 3',
  'CSL04':   'CSL Level 3',
  'CSL04_A': 'CSL Level 3',

  'Kung Fu and Lion Dance': 'Lion Dance & Kung Fu',

  'NewStudent':  null,
  'TBD1':        null,
  'TBD':         null,
  '':            null,
  '成人跳操课':    null,
  'Summer Camp': null,
}

const ENRICHMENT_CLASSES = new Set([
  'Art 1', 'Art 2',
  'Lion Dance & Kung Fu',
  'Dance Lower Level', 'Dance Upper Level',
  'Chess', 'Math', 'Critical Thinking',
  'Music Theory', 'Presentable',
])

// ── STATS ──────────────────────────────────────────────────────
const stats = {
  families:    { created: 0, existing: 0 },
  students:    { created: 0, existing: 0 },
  enrollments: { created: 0, existing: 0, skipped: 0 },
  classes:     { created: 0, existing: 0 },
  errors:      [] as string[],
}

// ── HELPERS ────────────────────────────────────────────────────

function resolveClassName(csvCourse: string): string | null {
  if (csvCourse in CLASS_MAP && CLASS_MAP[csvCourse] === null) return null
  return CLASS_MAP[csvCourse] ?? csvCourse
}

function isEnrichmentClass(className: string): boolean {
  return ENRICHMENT_CLASSES.has(className) ||
    (!className.startsWith('CHL') &&
     !className.startsWith('CSL') &&
     className !== 'AP Chinese')
}

async function getOrCreateHistoricalClass(
  csvCourse: string,
  year: string
): Promise<string | null> {
  const className = resolveClassName(csvCourse)
  if (!className) return null

  const historicalName = `${className} (${year})`

  const existing = await prisma.class.findFirst({
    where: { nameEn: historicalName, year },
  })
  if (existing) {
    stats.classes.existing++
    return existing.id
  }

  if (DRY_RUN) {
    console.log(`  [DRY] Create class: ${historicalName}`)
    stats.classes.created++
    return 'dry-run-id'
  }

  const cls = await prisma.class.create({
    data: {
      name: historicalName,
      nameEn: historicalName,
      year,
      type: isEnrichmentClass(className) ? 'ARTS' : 'CHINESE',
      schedule: {},
      fee: 0,
      capacity: 999,
      isActive: false,
      description: `Historical record — migrated from ${year} registration data`,
    },
  })
  stats.classes.created++
  return cls.id
}

// ── FILE PROCESSOR ─────────────────────────────────────────────

async function processFile(filepath: string, year: string) {
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Processing: ${year}`)
  console.log(`${'─'.repeat(50)}`)

  if (!fs.existsSync(filepath)) {
    const msg = `File not found: ${filepath}`
    console.error(`❌ ${msg}`)
    stats.errors.push(msg)
    return
  }

  const content = fs.readFileSync(filepath, 'utf-8').replace(/^﻿/, '')
  const rows: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  // ── GROUP BY CANONICAL STUDENT ID ──
  const nameEmailToCanonicalId = new Map<string, string>()
  const byStudent = new Map<string, Record<string, string>[]>()

  for (const row of rows) {
    const sid = row.StudentID.trim()
    const nameKey = [
      row.FirstName.trim().toLowerCase(),
      row.LastName.trim().toLowerCase(),
      row.Parent1UserNameEmail.trim().toLowerCase(),
    ].join('|')

    if (!nameEmailToCanonicalId.has(nameKey)) {
      nameEmailToCanonicalId.set(nameKey, sid)
    }
    const canonicalId = nameEmailToCanonicalId.get(nameKey)!

    if (!byStudent.has(canonicalId)) byStudent.set(canonicalId, [])
    byStudent.get(canonicalId)!.push(row)
  }

  // ── GROUP BY FAMILY EMAIL ──
  const byFamily = new Map<string, Record<string, string>>()
  for (const row of rows) {
    const email = row.Parent1UserNameEmail.trim().toLowerCase()
    if (email && !byFamily.has(email)) byFamily.set(email, row)
  }

  console.log(`  Families: ${byFamily.size}`)
  console.log(`  Students: ${byStudent.size}`)

  const familyCache = new Map<string, string>()

  // ── STEP 1: CREATE/FIND FAMILIES ──
  for (const [email, row] of byFamily) {
    try {
      const existing = await prisma.user.findUnique({
        where: { email },
        include: { family: true },
      })

      if (existing?.family) {
        familyCache.set(email, existing.family.id)
        stats.families.existing++

        if (!existing.family.address && row.AddressLine1?.trim() && !DRY_RUN) {
          await prisma.family.update({
            where: { id: existing.family.id },
            data: {
              address: row.AddressLine1.trim() || null,
              city: row.City?.trim() || null,
              state: row.State?.trim() || 'NC',
              zipCode: row.Zip?.trim() || null,
            },
          })
        }
        continue
      }

      const phone = row.Parent1PhoneNumber?.replace(/\D/g, '') || ''
      const tempPassword = 'CCA' + (phone.slice(-4) || '0000')
      const parentName = row.Parent1ChineseName?.trim()
        ? `${row.Parent1ChineseName} (${row.Parent1FirstName} ${row.Parent1LastName})`
        : `${row.Parent1FirstName} ${row.Parent1LastName}`

      if (DRY_RUN) {
        console.log(`  [DRY] Create family: ${email} (pwd: ${tempPassword})`)
        familyCache.set(email, `dry-${email}`)
        stats.families.created++
        continue
      }

      const hashedPw = await bcrypt.hash(tempPassword, 10)
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            name: parentName,
            password: hashedPw,
            role: 'PARENT',
            phone: row.Parent1PhoneNumber?.trim() || null,
            preferredLanguage: row.Parent1ChineseName?.trim() ? 'zh' : 'en',
          },
        })
        // Family has no userId field — link via User.familyId
        const family = await tx.family.create({
          data: {
            address: row.AddressLine1?.trim() || null,
            city: row.City?.trim() || null,
            state: row.State?.trim() || 'NC',
            zipCode: row.Zip?.trim() || null,
          },
        })
        await tx.user.update({
          where: { id: user.id },
          data: { familyId: family.id },
        })
        return { user, family }
      })

      familyCache.set(email, result.family.id)
      stats.families.created++

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      stats.errors.push(`[${year}] Family ${email}: ${msg}`)
      console.error(`  ❌ Family ${email}: ${msg}`)
    }
  }

  // ── STEP 2: CREATE/FIND STUDENTS + ENROLLMENTS ──
  for (const [canonicalId, studentRows] of byStudent) {
    const row = studentRows[0]
    const email = row.Parent1UserNameEmail.trim().toLowerCase()
    const familyId = familyCache.get(email)

    if (!familyId) {
      const msg = `No family for student ${canonicalId} (${email})`
      stats.errors.push(`[${year}] ${msg}`)
      console.error(`  ❌ ${msg}`)
      continue
    }

    try {
      let student = await prisma.student.findFirst({
        where: { legacyStudentId: canonicalId },
      })

      if (!student && !familyId.startsWith('dry-')) {
        student = await prisma.student.findFirst({
          where: {
            familyId,
            nameEn: `${row.FirstName.trim()} ${row.LastName.trim()}`,
          },
        })
        // Backfill legacyStudentId if found by name match
        if (student && !student.legacyStudentId && !DRY_RUN) {
          await prisma.student.update({
            where: { id: student.id },
            data: { legacyStudentId: canonicalId },
          })
        }
      }

      if (!student) {
        const age = parseInt(row.Age) || 10
        const birthYear = new Date().getFullYear() - age

        if (DRY_RUN) {
          console.log(`  [DRY] Create student: ${row.FirstName} ${row.LastName} (ID: ${canonicalId})`)
          stats.students.created++
        } else {
          // Student.name = Chinese name, Student.nameEn = English name
          student = await prisma.student.create({
            data: {
              familyId,
              legacyStudentId: canonicalId,
              name: row.ChineseName?.trim() ||
                `${row.FirstName.trim()} ${row.LastName.trim()}`,
              nameEn: `${row.FirstName.trim()} ${row.LastName.trim()}`,
              birthDate: new Date(`${birthYear}-09-01`),
              gender: row.Gender === 'M' ? 'MALE' :
                      row.Gender === 'F' ? 'FEMALE' : 'OTHER',
            },
          })
          stats.students.created++
        }
      } else {
        // Backfill Chinese name if now available
        if (!student.name.match(/[一-鿿]/) && row.ChineseName?.trim() && !DRY_RUN) {
          await prisma.student.update({
            where: { id: student.id },
            data: { name: row.ChineseName.trim() },
          })
        }
        stats.students.existing++
      }

      // ── CREATE ENROLLMENTS ──
      const enrolledClassNames = new Set<string>()

      for (const enrollRow of studentRows) {
        const csvCourse = enrollRow.Course?.trim()
        const className = resolveClassName(csvCourse)

        if (!className) { stats.enrollments.skipped++; continue }
        if (enrolledClassNames.has(className)) { stats.enrollments.skipped++; continue }
        enrolledClassNames.add(className)

        const classId = await getOrCreateHistoricalClass(csvCourse, year)
        if (!classId) { stats.enrollments.skipped++; continue }

        if (DRY_RUN || !student) {
          console.log(`  [DRY] Enroll: ${row.FirstName} ${row.LastName} → ${className} (${year})`)
          stats.enrollments.created++
          continue
        }

        const existing = await prisma.enrollment.findFirst({
          where: { studentId: student.id, classId, status: 'CONFIRMED' },
        })
        if (existing) { stats.enrollments.existing++; continue }

        await prisma.enrollment.create({
          data: { studentId: student.id, classId, status: 'CONFIRMED' },
        })
        stats.enrollments.created++
      }

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      stats.errors.push(`[${year}] Student ${canonicalId}: ${msg}`)
      console.error(`  ❌ Student ${canonicalId}: ${msg}`)
    }
  }
}

// ── MAIN ───────────────────────────────────────────────────────

async function main() {
  const before = {
    users:       await prisma.user.count(),
    families:    await prisma.family.count(),
    students:    await prisma.student.count(),
    enrollments: await prisma.enrollment.count(),
    classes:     await prisma.class.count(),
  }
  console.log('\nDB state BEFORE migration:')
  Object.entries(before).forEach(([k, v]) => console.log(`  ${k}: ${v}`))

  for (const file of FILES) {
    await processFile(file.path, file.year)
  }

  if (!DRY_RUN) {
    const after = {
      users:       await prisma.user.count(),
      families:    await prisma.family.count(),
      students:    await prisma.student.count(),
      enrollments: await prisma.enrollment.count(),
      classes:     await prisma.class.count(),
    }
    console.log('\nDB state AFTER migration:')
    Object.entries(after).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
    console.log('\nNet changes:')
    console.log(`  Users:       +${after.users - before.users}`)
    console.log(`  Families:    +${after.families - before.families}`)
    console.log(`  Students:    +${after.students - before.students}`)
    console.log(`  Enrollments: +${after.enrollments - before.enrollments}`)
    console.log(`  Classes:     +${after.classes - before.classes}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Families  created:    ${stats.families.created}`)
  console.log(`Families  existing:   ${stats.families.existing}`)
  console.log(`Students  created:    ${stats.students.created}`)
  console.log(`Students  existing:   ${stats.students.existing}`)
  console.log(`Classes   created:    ${stats.classes.created}`)
  console.log(`Classes   existing:   ${stats.classes.existing}`)
  console.log(`Enrollments created:  ${stats.enrollments.created}`)
  console.log(`Enrollments existing: ${stats.enrollments.existing}`)
  console.log(`Enrollments skipped:  ${stats.enrollments.skipped}`)
  console.log(`Errors:               ${stats.errors.length}`)

  if (stats.errors.length > 0) {
    console.log('\nErrors:')
    stats.errors.forEach(e => console.log(`  - ${e}`))
    fs.writeFileSync('migration-errors.log', stats.errors.join('\n'))
    console.log('\nSaved to migration-errors.log')
  }

  if (!DRY_RUN && stats.families.created > 0) {
    const lines = ['Email,TempPassword,ParentName,FirstYear']
    const seen = new Set<string>()

    for (const file of FILES) {
      if (!fs.existsSync(file.path)) continue
      const content = fs.readFileSync(file.path, 'utf-8').replace(/^﻿/, '')
      const rows: Record<string, string>[] = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
      for (const row of rows) {
        const email = row.Parent1UserNameEmail?.trim().toLowerCase()
        if (!email || seen.has(email)) continue
        seen.add(email)
        const phone = row.Parent1PhoneNumber?.replace(/\D/g, '') || ''
        const pwd = 'CCA' + (phone.slice(-4) || '0000')
        const name = `${row.Parent1FirstName} ${row.Parent1LastName}`
        lines.push(`${email},${pwd},${name},${file.year}`)
      }
    }

    fs.writeFileSync('migration-passwords.csv', lines.join('\n'))
    console.log('\n⚠️  Passwords saved to migration-passwords.csv')
    console.log('    Share with families SECURELY — not via plain email')
  }

  console.log('\n✅ Migration complete')
  await prisma.$disconnect()
}

main().catch(console.error)
