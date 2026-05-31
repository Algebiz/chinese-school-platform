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
import { ContactConfirmation } from '@/emails/ContactConfirmation'
import { ContactNotification } from '@/emails/ContactNotification'
import { ExamRegistrationConfirmation } from '@/emails/ExamRegistrationConfirmation'
import type { ExamRegistrationConfirmationProps } from '@/emails/ExamRegistrationConfirmation'
import { ExamRegistrationApproved } from '@/emails/ExamRegistrationApproved'
import type { ExamRegistrationApprovedProps } from '@/emails/ExamRegistrationApproved'
import { ExamRegistrationRejected } from '@/emails/ExamRegistrationRejected'
import type { ExamRegistrationRejectedProps } from '@/emails/ExamRegistrationRejected'
import { VolunteerClaimSubmitted } from '@/emails/VolunteerClaimSubmitted'
import type { VolunteerClaimSubmittedProps } from '@/emails/VolunteerClaimSubmitted'
import { VolunteerClaimApproved } from '@/emails/VolunteerClaimApproved'
import type { VolunteerClaimApprovedProps } from '@/emails/VolunteerClaimApproved'
import { VolunteerClaimRejected } from '@/emails/VolunteerClaimRejected'
import type { VolunteerClaimRejectedProps } from '@/emails/VolunteerClaimRejected'
import { VolunteerRefundProcessed } from '@/emails/VolunteerRefundProcessed'
import type { VolunteerRefundProcessedProps } from '@/emails/VolunteerRefundProcessed'
import { VolunteerDepositForfeited } from '@/emails/VolunteerDepositForfeited'
import type { VolunteerDepositForfeitedProps } from '@/emails/VolunteerDepositForfeited'
import { UnenrollmentNotification } from '@/emails/UnenrollmentNotification'
import type { UnenrollmentNotificationProps } from '@/emails/UnenrollmentNotification'
import { ClassExamResultNotification } from '@/emails/ClassExamResultNotification'
import type { ClassExamResultNotificationProps } from '@/emails/ClassExamResultNotification'

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
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set — cannot send welcome email')
    return
  }
  console.log('[email] sendWelcomeEmail → to:', to, '| from:', FROM)
  const html = await render(createElement(WelcomeEmail, { parentName }))
  const result = await resend.emails.send({
    from: FROM,
    to,
    subject: `欢迎加入夏洛特中文学校 / Welcome to Charlotte Chinese Academy`,
    html,
  })
  if (result.error) {
    console.error('[email] Resend rejected welcome email:', JSON.stringify(result.error))
    throw new Error(`Resend error: ${result.error.message ?? JSON.stringify(result.error)}`)
  }
  console.log('[email] Welcome email accepted by Resend, id:', result.data?.id)
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

export async function sendContactConfirmation(
  to: string,
  data: { name: string; subject: string; message: string; academicYear?: string }
): Promise<void> {
  const html = await render(createElement(ContactConfirmation, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `感谢您联系夏洛特中文学校 / Thank you for contacting Charlotte Chinese Academy`,
    html,
  })
}

export async function sendContactNotification(data: {
  name: string
  email: string
  phone?: string | null
  subject: string
  message: string
  submittedAt: Date
}): Promise<void> {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM ?? 'info@charlottechineseacademy.org'
  const html = await render(
    createElement(ContactNotification, { ...data, submittedAt: data.submittedAt.toISOString() })
  )
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `[NEW CONTACT] ${data.subject} — ${data.name}`,
    html,
  })
}

export async function sendExamRegistrationReceived(
  to: string,
  data: ExamRegistrationConfirmationProps
): Promise<void> {
  const html = await render(createElement(ExamRegistrationConfirmation, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `考试报名已收到 / Exam Registration Received — ${data.examType} Level ${data.level}`,
    html,
  })
}

export async function sendExamRegistrationApproved(
  to: string,
  data: ExamRegistrationApprovedProps
): Promise<void> {
  const html = await render(createElement(ExamRegistrationApproved, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `考试报名已确认 / Exam Registration Confirmed — ${data.examType} Level ${data.level}`,
    html,
  })
}

export async function sendExamRegistrationRejected(
  to: string,
  data: ExamRegistrationRejectedProps
): Promise<void> {
  const html = await render(createElement(ExamRegistrationRejected, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `考试报名通知 / Exam Registration Notice — ${data.examType} Level ${data.level}`,
    html,
  })
}

export async function sendVolunteerClaimSubmitted(to: string, data: VolunteerClaimSubmittedProps): Promise<void> {
  const html = await render(createElement(VolunteerClaimSubmitted, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: '志愿服务申请已收到 / Volunteer Claim Received',
    html,
  })
}

export async function sendVolunteerClaimApproved(to: string, data: VolunteerClaimApprovedProps): Promise<void> {
  const html = await render(createElement(VolunteerClaimApproved, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: '志愿服务已确认！/ Volunteer Service Confirmed',
    html,
  })
}

export async function sendVolunteerClaimRejected(to: string, data: VolunteerClaimRejectedProps): Promise<void> {
  const html = await render(createElement(VolunteerClaimRejected, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: '志愿服务申请通知 / Volunteer Claim Notice',
    html,
  })
}

export async function sendVolunteerRefundProcessed(to: string, data: VolunteerRefundProcessedProps): Promise<void> {
  const html = await render(createElement(VolunteerRefundProcessed, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: '押金退款已处理 / Volunteer Deposit Refund Processed',
    html,
  })
}

export async function sendVolunteerDepositForfeited(to: string, data: VolunteerDepositForfeitedProps): Promise<void> {
  const html = await render(createElement(VolunteerDepositForfeited, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: '志愿服务押金通知 / Volunteer Deposit Notice',
    html,
  })
}

export async function sendUnenrollmentNotification(to: string, data: UnenrollmentNotificationProps): Promise<void> {
  const html = await render(createElement(UnenrollmentNotification, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `注册取消通知 / Enrollment Cancelled — ${data.studentName}`,
    html,
  })
}

export async function sendClassExamResultNotification(
  to: string,
  data: ClassExamResultNotificationProps
): Promise<void> {
  const html = await render(createElement(ClassExamResultNotification, data))
  await resend.emails.send({
    from: FROM,
    to,
    subject: `班级考试成绩通知 / Class Exam Results — ${data.studentName}`,
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
  textbookIds: string[],
  paymentMethod: 'STRIPE' | 'PAYPAL',
  transactionId: string,
  academicYear: string
): Promise<void> {
  const [student, classes, textbooks] = await Promise.all([
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
    textbookIds.length > 0
      ? prisma.textbook.findMany({
          where: { id: { in: textbookIds } },
          select: { name: true, nameZh: true, price: true },
        })
      : [],
  ])

  const parentUser = student?.family?.users[0]
  if (!parentUser?.email || !student) return

  const tuitionTotal = classes.reduce((sum, c) => sum + parseFloat(c.fee.toString()), 0)
  const textbookTotal = textbooks.reduce((sum, t) => sum + parseFloat(t.price.toString()), 0)

  await sendEnrollmentConfirmation(parentUser.email, {
    parentName: parentUser.name ?? '家长',
    studentName: student.name,
    classes: classes.map((c) => ({
      name: c.name,
      teacher: c.teacher?.name ?? null,
      schedule: fmtSchedule(c.schedule),
      fee: c.fee.toString(),
    })),
    textbooks: textbooks.map((t) => ({
      name: t.name,
      nameZh: t.nameZh,
      price: t.price.toString(),
    })),
    total: (tuitionTotal + textbookTotal).toFixed(2),
    paymentMethod,
    transactionId,
    academicYear,
  })
}
