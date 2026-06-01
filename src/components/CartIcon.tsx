'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart/CartContext'

export function CartIcon() {
  const { itemCount } = useCart()
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/cart')}
      aria-label="Shopping cart"
      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      {/* Cart icon (simple SVG) */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>

      {/* Badge */}
      {itemCount > 0 && (
        <span style={{
          position: 'absolute',
          top: -2,
          right: -4,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          background: '#CC0000',
          color: 'white',
          fontSize: 10,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 3px',
          lineHeight: 1,
        }}>
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  )
}
