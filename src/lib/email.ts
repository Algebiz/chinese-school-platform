import { createElement } from 'react'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { prisma } from './db'
import { WelcomeEmail } from '@/emails/WelcomeEmail'
import { EnrollmentConfirmation } from '@/emails/EnrollmentConfirmation'
import type { EnrollmentConfirmationProps } from '@/emails/EnrollmentConfirmation'
import { ClassChangeNotification } from '@/emails/ClassChangeNotification'
import type { ClassChangeNotificationProps } from '@/emails/ClassChangeNotification'
import { WaitlistNotification } from '@/emails/WaitlistNotification'
import type { WaitlistNotificationProps } from '@/emails/WaitlistNotification'
import { WaitlistPromotion } from '@/emails/WaitlistPromotion'
import type { WaitlistPromotionProps } from '@/emails/WaitlistPromotion'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'noreply@chineseschool.com'

// ── Exported data types ───────────────────────────────────────────────────────

export type EnrollmentData = Omit<EnrollmentConfirmationProps, 'parentName' | 'studentName'> & {
  parentName: string
  studentName: string
}

export type ClassChangeData = Omit<ClassChangeNotificationProps, 'parentName' | 'studentName'> & {
  parentName: string
  studentName: string
}

export interface WaitlistData {
  parentName: string
  studentName: string
  className: string
  position?: number
  requiresPayment?: boolean
}

// ── Exported functions ────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, parentName: string): Promise<void> {
  const html = await render(createElement(WelcomeEmail, { parentName }))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `欢迎加入XX中文学校 / Welcome to XX Chinese School`,
    html,
  })
}

export async function sendEnrollmentConfirmation(to: string, data: EnrollmentData): Promise<void> {
  const html = await render(createElement(EnrollmentConfirmation, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `报名确认 / Enrollment Confirmed — ${data.studentName}`,
    html,
  })
}

export async function sendClassChangeNotification(to: string, data: ClassChangeData): Promise<void> {
  const html = await render(createElement(ClassChangeNotification, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `班级调整通知 / Class Transfer Notice — ${data.studentName}`,
    html,
  })
}

export async function sendWaitlistConfirmation(to: string, data: WaitlistData): Promise<void> {
  if (data.position === undefined) return
  const props: WaitlistNotificationProps = {
    parentName: data.parentName,
    studentName: data.studentName,
    className: data.className,
    position: data.position,
  }
  const html = await render(createElement(WaitlistNotification, props))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `候补名单确认 / Waitlist Confirmed — ${data.studentName}`,
    html,
  })
}

export async function sendWaitlistPromotion(to: string, data: WaitlistData): Promise<void> {
  const props: WaitlistPromotionProps = {
    parentName: data.parentName,
    studentName: data.studentName,
    className: data.className,
    requiresPayment: data.requiresPayment ?? true,
  }
  const html = await render(createElement(WaitlistPromotion, props))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `恭喜！名额已确认 / Spot Available — ${data.studentName}`,
    html,
  })
}

// ── Internal helper used by Stripe webhook & PayPal capture ──────────────────
// Fetches all needed data from DB, then calls sendEnrollmentConfirmation.

function fmtSchedule(schedule: unknown): string {
  if (!schedule || typeof schedule !== 'object') return ''
  const s = schedule as Record<string, string>
  return [s.dayOfWeek, s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : '']
    .filter(Boolean)
    .join(' ')
}

export async function sendEnrollmentConfirmationByIds(
  studentId: string,
  classIds: string[],
  paymentMethod: 'STRIPE' | 'PAYPAL',
  transactionId: string
): Promise<void> {
  const [student, classes] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        family: { include: { users: { select: { email: true, name: true } } } },
      },
    }),
    prisma.class.findMany({
      where: { id: { in: classIds } },
      include: { teacher: { select: { name: true } } },
    }),
  ])

  const parentUser = student?.family?.users[0]
  if (!parentUser?.email || !student) return

  const total = classes.reduce((sum, c) => sum + parseFloat(c.fee.toString()), 0)

  await sendEnrollmentConfirmation(parentUser.email, {
    parentName: parentUser.name ?? '家长',
    studentName: student.name,
    classes: classes.map((c) => ({
      name: c.name,
      teacher: c.teacher?.name ?? null,
      schedule: fmtSchedule(c.schedule),
      fee: c.fee.toString(),
    })),
    total: total.toFixed(2),
    paymentMethod,
    transactionId,
  })
}
