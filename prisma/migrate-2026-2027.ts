import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import * as fs from 'fs'
import { parse } from 'csv-parse/sync'
import * as bcrypt from 'bcryptjs'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })
const DRY_RUN = process.env.DRY_RUN === 'true'
const YEAR = '2026-2027'
const CSV_PATH = 'uploads/2026-2027.csv'

console.log('\n' + '='.repeat(60))
console.log('CCA 2026-2027 Enrollment Migration')
console.log(`CSV: ${CSV_PATH}`)
console.log(DRY_RUN ? '🔍 DRY RUN — no data written' : '🚀 LIVE RUN — writing to database')
console.log('='.repeat(60))

// ── CLASS SEARCH MAP ───────────────────────────────────────────────
// Maps CSV course codes → exact `nameEn` of the active DB class.
// null = intentionally skip (TBD, NewStudent, etc.)
//
// Exact match (not `contains`) — substring search previously matched
// "CHL Level 1" against "CHL Level 10" before "CHL Level 1A"/"1B",
// mis-routing all CHL01 registrants into CHL Level 10. Where a CSV
// code is ambiguous between sections (e.g. CHL01 → 1A or 1B, CHL04 →
// 4A/4B/4 Intensive), the exact name below preserves the resolution
// the old search produced (section A / non-intensive first).
const CLASS_SEARCH_MAP: Record<string, string | null> = {
  'CHL01':                 'CHL Level 1A',
  'CHL02':                 'CHL Level 2',
  'CHL03':                 'CHL Level 3A',
  'CHL04':                 'CHL Level 4A',
  'CHL05':                 'CHL Level 5',
  'CHL06':                 'CHL Level 6',
  'CHL07':                 'CHL Level 7',
  'CHL08':                 'CHL Level 8',
  'CHL09':                 'CHL Level 9',
  'CHL10':                 'CHL Level 10',
  'AP':                    'AP Chinese',
  'CSL01_A':               'CSL Level 1A',
  'CSL02_A':               'CSL Level 2',
  'CSL03_A':               'CSL Level 3',
  'CSL04_A':               'CSL Level 3',
  'Art 1':                 'Art 1',
  'Art 2':                 'Art 2',
  'Kung Fu and Lion Dance': 'Lion Dance & Kung Fu',
  'Dance Lower Level':     'Dance Lower Level',
  'Dance Upper Level':     'Dance Upper Level',
  'Chess':                 'Chess',
  'Math':                  'Math',
  'NewStudent':            null,
  'TBD1':                  null,
  'TBD':                   null,
  '':                      null,
}

// ── STATS ──────────────────────────────────────────────────────────
const stats = {
  families:      { created: 0, existing: 0 },
  students:      { created: 0, existing: 0 },
  enrollments:   { created: 0, existing: 0, skipped: 0 },
  classNotFound: [] as string[],
  errors:        [] as string[],
  newFamilies:   [] as { email: string; pwd: string; name: string }[],
}

// ── CLASS LOOKUP (reads DB even in dry-run — read-only) ────────────
const classCache = new Map<string, { id: string; name: string } | null>()

async function findActiveClass(csvCourse: string): Promise<{ id: string; name: string } | null> {
  if (classCache.has(csvCourse)) return classCache.get(csvCourse) ?? null

  if (!(csvCourse in CLASS_SEARCH_MAP)) {
    if (!stats.classNotFound.includes(csvCourse)) {
      stats.classNotFound.push(csvCourse)
      console.warn(`  ⚠️  Unknown course code: "${csvCourse}"`)
    }
    classCache.set(csvCourse, null)
    return null
  }

  const exactName = CLASS_SEARCH_MAP[csvCourse]
  if (exactName === null) {
    classCache.set(csvCourse, null)
    return null
  }

  // Exact match on nameEn — no substring ambiguity (e.g. "CHL Level 1" ⊂ "CHL Level 10")
  const cls = await prisma.class.findFirst({
    where: {
      year: YEAR,
      isActive: true,
      nameEn: exactName,
    },
    select: { id: true, name: true, nameEn: true },
  })

  if (!cls) {
    if (!stats.classNotFound.includes(csvCourse)) {
      stats.classNotFound.push(csvCourse)
      console.warn(`  ⚠️  No active ${YEAR} class for: "${csvCourse}" (looking for nameEn="${exactName}")`)
    }
    classCache.set(csvCourse, null)
    return null
  }

  const result = { id: cls.id, name: cls.nameEn ?? cls.name }
  classCache.set(csvCourse, result)
  return result
}

// ── FILE PROCESSOR ─────────────────────────────────────────────────

async function processFile() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ File not found: ${CSV_PATH}`)
    stats.errors.push(`File not found: ${CSV_PATH}`)
    return
  }

  const content = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^﻿/, '')
  const rows: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  // ── GROUP BY CANONICAL STUDENT ID (same name+email → same student) ──
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

  console.log(`\n  Families in CSV: ${byFamily.size}`)
  console.log(`  Students in CSV: ${byStudent.size}`)

  const familyCache = new Map<string, string>()

  // ── STEP 1: CREATE/FIND FAMILIES ──────────────────────────────────
  for (const [email, row] of byFamily) {
    try {
      const existing = await prisma.user.findUnique({
        where: { email },
        include: { family: true },
      })

      if (existing?.family) {
        familyCache.set(email, existing.family.id)
        stats.families.existing++

        // Backfill address if missing
        if (!existing.family.address && row.AddressLine1?.trim() && !DRY_RUN) {
          await prisma.family.update({
            where: { id: existing.family.id },
            data: {
              address: row.AddressLine1.trim() || null,
              city:    row.City?.trim() || null,
              state:   row.State?.trim() || 'NC',
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
        const family = await tx.family.create({
          data: {
            address: row.AddressLine1?.trim() || null,
            city:    row.City?.trim() || null,
            state:   row.State?.trim() || 'NC',
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
      stats.newFamilies.push({ email, pwd: tempPassword, name: parentName })

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      stats.errors.push(`Family ${email}: ${msg}`)
      console.error(`  ❌ Family ${email}: ${msg}`)
    }
  }

  // ── STEP 2: CREATE/FIND STUDENTS + ENROLLMENTS ────────────────────
  for (const [canonicalId, studentRows] of byStudent) {
    const row = studentRows[0]
    const email = row.Parent1UserNameEmail.trim().toLowerCase()
    const familyId = familyCache.get(email)

    if (!familyId) {
      const msg = `No family for student ${canonicalId} (${row.FirstName} ${row.LastName})`
      stats.errors.push(msg)
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
        if (!student.name.match(/[一-鿿]/) && row.ChineseName?.trim() && !DRY_RUN) {
          await prisma.student.update({
            where: { id: student.id },
            data: { name: row.ChineseName.trim() },
          })
        }
        stats.students.existing++
      }

      // ── ENROLLMENTS ────────────────────────────────────────────────
      const enrolledClassIds = new Set<string>()

      for (const enrollRow of studentRows) {
        const csvCourse = enrollRow.Course?.trim()
        const cls = await findActiveClass(csvCourse)

        if (!cls) { stats.enrollments.skipped++; continue }
        if (enrolledClassIds.has(cls.id)) { stats.enrollments.skipped++; continue }
        enrolledClassIds.add(cls.id)

        if (DRY_RUN || !student) {
          console.log(`  [DRY] Enroll: ${row.FirstName} ${row.LastName} → ${cls.name}`)
          stats.enrollments.created++
          continue
        }

        const existing = await prisma.enrollment.findFirst({
          where: { studentId: student.id, classId: cls.id },
        })
        if (existing) { stats.enrollments.existing++; continue }

        await prisma.enrollment.create({
          data: { studentId: student.id, classId: cls.id, status: 'CONFIRMED' },
        })
        stats.enrollments.created++
      }

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      stats.errors.push(`Student ${canonicalId}: ${msg}`)
      console.error(`  ❌ Student ${canonicalId}: ${msg}`)
    }
  }
}

// ── MAIN ───────────────────────────────────────────────────────────

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

  await processFile()

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
  }

  console.log('\n' + '='.repeat(60))
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Families  created:    ${stats.families.created}`)
  console.log(`Families  existing:   ${stats.families.existing}`)
  console.log(`Students  created:    ${stats.students.created}`)
  console.log(`Students  existing:   ${stats.students.existing}`)
  console.log(`Enrollments created:  ${stats.enrollments.created}`)
  console.log(`Enrollments existing: ${stats.enrollments.existing}`)
  console.log(`Enrollments skipped:  ${stats.enrollments.skipped}`)
  console.log(`Errors:               ${stats.errors.length}`)

  if (stats.classNotFound.length > 0) {
    console.log(`\n⚠️  Course codes with no matching active class (${stats.classNotFound.length}):`)
    stats.classNotFound.forEach(c => console.log(`  - "${c}"`))
    console.log('  → These students need manual class assignment in admin panel')
  }

  if (stats.errors.length > 0) {
    console.log('\nErrors:')
    stats.errors.forEach(e => console.log(`  - ${e}`))
    fs.writeFileSync('migration-2026-2027-errors.log', stats.errors.join('\n'))
    console.log('\nSaved to migration-2026-2027-errors.log')
  }

  if (!DRY_RUN && stats.newFamilies.length > 0) {
    const lines = ['Email,TempPassword,ParentName']
    stats.newFamilies.forEach(f =>
      lines.push(`${f.email},${f.pwd},${f.name}`)
    )
    fs.writeFileSync('migration-2026-2027-passwords.csv', lines.join('\n'))
    console.log(`\n⚠️  Passwords saved to migration-2026-2027-passwords.csv (${stats.newFamilies.length} new families)`)
    console.log('    Share SECURELY — not via plain email')
  }

  console.log('\n✅ Migration complete')
  await prisma.$disconnect()
}

main().catch(console.error)
