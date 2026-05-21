import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const BOM = '﻿'

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells
    .map((c) => {
      const s = c == null ? '' : String(c)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    })
    .join(',')
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'all'
  const classId = searchParams.get('classId')

  if (type === 'roster') {
    if (!classId) {
      return NextResponse.json(
        { success: false, error: 'classId required for roster export', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } })
    if (!cls) {
      return NextResponse.json({ success: false, error: 'Class not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: 'CONFIRMED' },
      include: {
        student: {
          include: {
            family: { include: { users: { select: { name: true, email: true, phone: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const header = csvRow(['#', '中文姓名', '英文姓名', '家长姓名', '电话', '邮箱', '报名日期'])
    const rows = enrollments.map((e, i) => {
      const parent = e.student.family?.users[0]
      return csvRow([
        i + 1,
        e.student.name,
        e.student.nameEn ?? '',
        parent?.name ?? '',
        parent?.phone ?? '',
        parent?.email ?? '',
        e.createdAt.toLocaleDateString('zh-CN'),
      ])
    })

    const csv = BOM + [header, ...rows].join('\n')
    const filename = `roster-${cls.name.replace(/\s+/g, '_')}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  if (type === 'payments') {
    const payments = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                family: { include: { users: { select: { name: true, email: true } } } },
              },
            },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const header = csvRow(['支付日期', '家长姓名', '邮箱', '学生姓名', '班级', '金额', '支付方式', '交易ID'])
    const rows = payments.map((p) => {
      const parent = p.enrollment.student.family?.users[0]
      return csvRow([
        p.createdAt.toLocaleDateString('zh-CN'),
        parent?.name ?? '',
        parent?.email ?? '',
        p.enrollment.student.name,
        p.enrollment.class.name,
        p.amount.toString(),
        p.method,
        p.stripeIntentId ?? p.paypalOrderId ?? '',
      ])
    })

    const csv = BOM + [header, ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="payments.csv"',
      },
    })
  }

  // type === 'all': all confirmed enrollments across every class
  const enrollments = await prisma.enrollment.findMany({
    where: { status: 'CONFIRMED' },
    include: {
      class: { select: { name: true, type: true } },
      student: {
        include: {
          family: { include: { users: { select: { name: true, email: true, phone: true } } } },
        },
      },
    },
    orderBy: [{ class: { name: 'asc' } }, { createdAt: 'asc' }],
  })

  const header = csvRow(['班级', '班级类型', '中文姓名', '英文姓名', '家长姓名', '电话', '邮箱', '报名日期'])
  const rows = enrollments.map((e) => {
    const parent = e.student.family?.users[0]
    return csvRow([
      e.class.name,
      e.class.type === 'CHINESE' ? '中文班' : '才艺班',
      e.student.name,
      e.student.nameEn ?? '',
      parent?.name ?? '',
      parent?.phone ?? '',
      parent?.email ?? '',
      e.createdAt.toLocaleDateString('zh-CN'),
    ])
  })

  const csv = BOM + [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="all-enrollments.csv"',
    },
  })
}
