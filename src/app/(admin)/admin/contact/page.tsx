import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ContactMessagesClient } from './ContactMessagesClient'
import type { ContactMessageRow } from './ContactMessagesClient'

export default async function AdminContactPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const unreadCount = messages.filter((m) => m.status === 'UNREAD').length
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeekCount = messages.filter((m) => new Date(m.createdAt) >= weekAgo).length

  const rows: ContactMessageRow[] = messages.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    subject: m.subject,
    message: m.message,
    status: m.status,
    repliedAt: m.repliedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">联系消息 / Contact Messages</h1>
        <p className="mt-1 text-sm text-gray-500">管理来自家长和访客的联系留言</p>
      </div>

      <div className="mb-6 flex items-center gap-6 text-sm text-gray-600">
        <span>共 <strong>{messages.length}</strong> 条消息</span>
        <span>
          未读{' '}
          <strong className={unreadCount > 0 ? 'text-red-600' : ''}>{unreadCount}</strong>
        </span>
        <span>本周 <strong>{thisWeekCount}</strong></span>
      </div>

      <ContactMessagesClient messages={rows} />
    </div>
  )
}
