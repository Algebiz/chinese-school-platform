import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [
      families, students, enrollments,
      examRegistrations, volunteerDeposits,
      classes, users,
    ] = await Promise.all([
      prisma.family.count(),
      prisma.student.count(),
      prisma.enrollment.count({ where: { status: 'CONFIRMED' } }),
      prisma.examRegistration.count({ where: { status: 'CONFIRMED' } }),
      prisma.volunteerDeposit.count(),
      prisma.class.count({ where: { isActive: true } }),
      prisma.user.count(),
    ])

    const studentsBackup = await prisma.student.findMany({
      include: {
        family: {
          include: { users: { select: { email: true, name: true } } },
        },
        enrollments: {
          where: { status: 'CONFIRMED' },
          include: { class: { select: { nameEn: true, year: true } } },
        },
      },
    })

    const backupData = {
      timestamp: new Date().toISOString(),
      counts: { families, students, enrollments, examRegistrations, volunteerDeposits, classes, users },
      students: studentsBackup.map(s => ({
        id: s.id,
        nameEn: s.nameEn,
        chineseName: s.name,
        parentEmail: s.family.users[0]?.email ?? null,
        parentName: s.family.users[0]?.name ?? null,
        enrollments: s.enrollments.map(e => ({
          class: e.class.nameEn,
          year: e.class.year,
        })),
      })),
    }

    const jsonString = JSON.stringify(backupData, null, 2)
    const base64Content = Buffer.from(jsonString, 'utf8').toString('base64')

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'noreply@charlottechineseacademy.org',
      to: process.env.ADMIN_BACKUP_EMAIL ?? 'alg.herbs@gmail.com',
      subject: `CCA Weekly Backup — ${new Date().toLocaleDateString()} — ${students} students`,
      html: `
        <meta charset="utf-8">
        <h2>CCA Platform Weekly Backup Report</h2>
        <p>Backup completed: ${new Date().toISOString()}</p>
        <h3>Record Counts:</h3>
        <ul>
          <li>Families: ${families}</li>
          <li>Students: ${students}</li>
          <li>Confirmed Enrollments: ${enrollments}</li>
          <li>Exam Registrations: ${examRegistrations}</li>
          <li>Volunteer Deposits: ${volunteerDeposits}</li>
          <li>Active Classes: ${classes}</li>
          <li>User Accounts: ${users}</li>
        </ul>
        <p>Full student data backup attached as JSON.</p>
        <p style="color:gray;font-size:12px;">
          This is an automated backup from the CCA registration platform.
        </p>
      `,
      attachments: [{
        filename: `cca-backup-${new Date().toISOString().split('T')[0]}.json`,
        content: base64Content,
        contentType: 'application/json; charset=utf-8',
      }],
    })

    console.log('[backup] Weekly backup completed:', { families, students, enrollments })
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: { families, students, enrollments },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[backup] Backup failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
