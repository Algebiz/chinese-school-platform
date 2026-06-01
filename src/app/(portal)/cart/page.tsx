import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { LanguageText } from '@/components/LanguageText'
import { CartClient } from '@/components/portal/CartClient'

export default async function CartPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>
          <LanguageText zh="购物车" en="Cart" />
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          <LanguageText zh="确认报名内容后一次性完成支付" en="Review your selections and pay in one transaction" />
        </p>
      </div>
      <CartClient />
    </div>
  )
}
