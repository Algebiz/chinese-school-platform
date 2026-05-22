import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { messageId } = await params
  const body = await req.json()
  const { status } = body

  if (!['UNREAD', 'READ', 'REPLIED'].includes(status)) {
    return NextResponse.json(
      { success: false, error: 'Invalid status', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const updated = await prisma.contactMessage.update({
    where: { id: messageId },
    data: {
      status,
      repliedAt: status === 'REPLIED' ? new Date() : undefined,
    },
  })

  return NextResponse.json({ success: true, data: updated })
}
