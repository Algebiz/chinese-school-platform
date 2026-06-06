'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useCart } from '@/lib/cart/CartContext'

interface Props {
  enrollmentId: string
  className: string
  total: string
  textbookNames: string[]
}

export function PendingEnrollmentCard({ enrollmentId, className, total, textbookNames }: Props) {
  const router = useRouter()
  const { t } = useLanguage()
  const { refreshCart } = useCart()
  const [showDialog, setShowDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/cancel`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setCancelled(true)
        setShowDialog(false)
        await refreshCart()
        router.refresh()
      } else {
        setError(json.error ?? t('取消失败，请重试', 'Cancellation failed, please try again'))
      }
    } catch {
      setError(t('网络错误，请重试', 'Network error, please try again'))
    } finally {
      setCancelling(false)
    }
  }

  if (cancelled) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        ✓ {t('注册已取消', 'Enrollment cancelled')}
      </div>
    )
  }

  const label = textbookNames.length > 0
    ? `${className} + ${t('教材', 'Textbooks')}`
    : className

  return (
    <>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">⚠ {t('待付款', 'Pending Payment')}</p>
            <p className="mt-0.5 text-sm text-amber-700">{label}</p>
          </div>
          <span className="shrink-0 text-sm font-bold text-amber-900">${parseFloat(total).toFixed(2)}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/cart"
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
          >
            {t('完成付款', 'Complete Payment')}
          </Link>
          <button
            onClick={() => setShowDialog(true)}
            className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
          >
            {t('取消注册', 'Cancel')}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">{t('确认取消', 'Confirm Cancellation')}</h3>
            <p className="mt-3 text-sm text-gray-700">
              {t('您确定要取消此注册吗？取消后，班级名额将释放，您需要重新报名。',
                 'Are you sure you want to cancel this enrollment? The class spot will be released and you\'ll need to re-enroll.')}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {cancelling ? t('取消中…', 'Cancelling…') : t('确认取消', 'Confirm Cancel')}
              </button>
              <button
                onClick={() => setShowDialog(false)}
                disabled={cancelling}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('返回', 'Go Back')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
