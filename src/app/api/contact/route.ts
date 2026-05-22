import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { sendContactConfirmation, sendContactNotification } from '@/lib/email'
import { getCurrentAcademicYear } from '@/lib/academic-year'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(30).optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(1, 'Message is required').max(1000),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { name, email, phone, subject, message } = result.data

    // Rate limit: max 3 per email per 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentCount = await prisma.contactMessage.count({
      where: { email, createdAt: { gte: since } },
    })
    if (recentCount >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: '您今天的提交次数已达上限，请明天再试。/ You have reached the daily submission limit. Please try again tomorrow.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      )
    }

    const contact = await prisma.contactMessage.create({
      data: { name, email, phone: phone || null, subject, message },
    })

    const academicYear = await getCurrentAcademicYear()

    // Send emails — non-fatal
    try {
      await sendContactConfirmation(email, { name, subject, message, academicYear })
    } catch (err) {
      console.error('Failed to send contact confirmation:', err)
    }
    try {
      await sendContactNotification({ name, email, phone, subject, message, submittedAt: contact.createdAt })
    } catch (err) {
      console.error('Failed to send contact notification:', err)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit contact form', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
