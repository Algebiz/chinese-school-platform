'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useCart, type CartItemData } from '@/lib/cart/CartContext'
import { badge } from '@/lib/design'

function CartSkeleton() {
  return (
    <div>
      <div style={{ height: 20, background: '#F9FAFB', borderRadius: 4, marginBottom: 16, width: 200 }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 80, background: '#F9FAFB', borderRadius: 8, marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

const CARD: React.CSSProperties = { border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white', marginBottom: 12 }
const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '0.5px solid #E5E7EB' }

export function CartClient() {
  const { t, lang } = useLanguage()
  const { rootItems, items, total, removeItem, clearCart, loading, refreshCart } = useCart()
  const router = useRouter()
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Force refresh on mount so cart page always shows fresh data (bypasses 30s cache)
  useEffect(() => { refreshCart(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [confirming, setConfirming] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)

  // Group root items by student
  const byStudent: Record<string, CartItemData[]> = {}
  const depositItems: CartItemData[] = []
  for (const item of rootItems) {
    if (item.type === 'DEPOSIT') { depositItems.push(item); continue }
    const key = item.studentId ?? '__no_student'
    if (!byStudent[key]) byStudent[key] = []
    byStudent[key].push(item)
  }

  function getChildren(parentId: string) {
    return items.filter(i => i.parentCartItemId === parentId)
  }

  async function handleRemove(id: string) {
    if (confirming !== id) { setConfirming(id); return }
    setConfirming(null)
    setRemovingId(id)
    await removeItem(id)
    setRemovingId(null)
  }

  async function handleCheckout() {
    console.log('=== CHECKOUT CLICKED ===')
    console.log('Cart items:', items)
    console.log('Items count:', items.length)

    const enrollmentItems = items.filter(i => i.type === 'ENROLLMENT' && !i.parentCartItemId)
    const examItems = items.filter(i => i.type === 'EXAM_REGISTRATION')
    console.log('Enrollment items:', enrollmentItems.length, 'Exam items:', examItems.length)

    if (enrollmentItems.length === 0 && examItems.length === 0) {
      console.log('No items to checkout, returning early')
      return
    }

    setCheckingOut(true)
    try {
      console.log('Calling /api/cart/checkout...')
      const res = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      console.log('Response status:', res.status)
      const json = await res.json()
      console.log('Response data:', json)

      if (!res.ok || !json.success) {
        console.error('Checkout API failed:', json)
        setCheckingOut(false)
        return
      }

      const enrollmentIds: string[] = json.data?.enrollmentIds ?? []
      const examRegistrationIds: string[] = json.data?.examRegistrationIds ?? []
      console.log('Enrollment IDs:', enrollmentIds, 'Exam Registration IDs:', examRegistrationIds)

      if (enrollmentIds.length === 0 && examRegistrationIds.length === 0) {
        console.error('No IDs returned — possible causes: items already paid (stale cart), or class at capacity (waitlisted)')
        router.push('/dashboard')
      } else {
        const params = new URLSearchParams()
        if (enrollmentIds.length > 0) params.set('enrollmentIds', enrollmentIds.join(','))
        if (examRegistrationIds.length > 0) params.set('examRegistrationIds', examRegistrationIds.join(','))
        const checkoutUrl = `/checkout?${params.toString()}`
        console.log('Redirecting to:', checkoutUrl)
        router.push(checkoutUrl)
      }
    } catch (e) {
      console.error('Checkout error:', e)
      setCheckingOut(false)
    }
  }

  if (loading) return <CartSkeleton />

  if (rootItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: 16, color: '#9ca3af', marginBottom: 16 }}>{t('购物车是空的', 'Your cart is empty')}</p>
        <Link href="/classes" style={{ padding: '8px 20px', borderRadius: 6, background: '#CC0000', color: 'white', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          {t('浏览班级', 'Browse Classes')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Items by student */}
      {Object.entries(byStudent).map(([studentId, studentItems]) => {
        const student = studentItems[0]?.student
        return (
          <div key={studentId} style={CARD}>
            {/* Student header */}
            <div style={{ padding: '12px 20px', background: '#F9FAFB', borderBottom: '0.5px solid #E5E7EB' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                {student?.name ?? t('学生', 'Student')}
                {student?.nameEn && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{student.nameEn}</span>}
              </span>
            </div>

            {studentItems.map((item, i) => {
              const children = getChildren(item.id)
              const isLast = i === studentItems.length - 1
              const removing = removingId === item.id
              const desc = lang === 'en' ? (item.descriptionEn || item.description) : item.description

              return (
                <div key={item.id}>
                  <div style={{ ...(isLast && children.length === 0 ? { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' } : ROW) }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{desc.split(' — ')[0]}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {item.type === 'ENROLLMENT' && <span style={badge('blue')}>{t('课程', 'Class')}</span>}
                        {item.type === 'EXAM_REGISTRATION' && <span style={badge('amber')}>{t('考试', 'Exam')}</span>}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {item.discountAmount && parseFloat(item.discountAmount) > 0 && item.originalPrice ? (
                        <>
                          <p style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>
                            ${parseFloat(item.originalPrice).toFixed(2)}
                          </p>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>${parseFloat(item.price).toFixed(2)}</p>
                          <span style={{ fontSize: 10, background: '#EAF3DE', color: '#3B6D11', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                            -{item.discountLabel ?? t('优惠', 'Discount')} ${parseFloat(item.discountAmount).toFixed(0)}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>${parseFloat(item.price).toFixed(2)}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removing}
                      style={{ fontSize: 12, color: confirming === item.id ? '#CC0000' : '#9ca3af', background: 'none', border: confirming === item.id ? '0.5px solid #CC0000' : 'none', borderRadius: 5, padding: confirming === item.id ? '3px 8px' : 0, cursor: 'pointer', flexShrink: 0 }}
                    >
                      {removing ? '…' : confirming === item.id ? t('确定？', 'Confirm?') : '✕'}
                    </button>
                  </div>

                  {/* Textbook children */}
                  {children.map((child, ci) => {
                    const childDesc = lang === 'en' ? (child.descriptionEn || child.description) : child.description
                    const isChildLast = ci === children.length - 1 && i === studentItems.length - 1
                    return (
                      <div key={child.id} style={isChildLast ? { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 12px 36px' } : { ...ROW, paddingLeft: 36 }}>
                        <p style={{ flex: 1, fontSize: 12, color: '#6b7280' }}>└ {childDesc.split(' (')[0]}</p>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>${parseFloat(child.price).toFixed(2)}</span>
                        <div style={{ width: 24 }} />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Deposit */}
      {depositItems.map(dep => (
        <div key={dep.id} style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{t('志愿服务押金', 'Volunteer Deposit')}</p>
              <p style={{ fontSize: 11, color: '#9ca3af' }}>{t('完成1次志愿服务后可申请退还', 'Refundable after volunteer service')}</p>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>${parseFloat(dep.price).toFixed(2)}</span>
          </div>
        </div>
      ))}

      {/* Summary + checkout */}
      <div style={{ border: '0.5px solid #E5E7EB', borderRadius: 12, background: 'white', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{t('合计', 'Total')}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#CC0000' }}>${total.toFixed(2)}</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={checkingOut || loading}
          style={{ width: '100%', padding: '12px', borderRadius: 8, background: checkingOut ? '#E5E7EB' : '#CC0000', color: checkingOut ? '#9ca3af' : 'white', border: 'none', fontSize: 15, fontWeight: 600, cursor: checkingOut ? 'not-allowed' : 'pointer' }}
        >
          {checkingOut ? t('处理中…', 'Processing…') : `${t('前往支付', 'Checkout')} →`}
        </button>
        <Link href="/enroll" style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
          {t('继续报名', 'Continue Shopping')}
        </Link>
      </div>
    </div>
  )
}
