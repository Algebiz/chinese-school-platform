'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'

export interface CartItemData {
  id: string
  type: 'ENROLLMENT' | 'EXAM_REGISTRATION' | 'TEXTBOOK' | 'DEPOSIT'
  studentId: string | null
  classId: string | null
  examSessionId: string | null
  textbookId: string | null
  parentCartItemId: string | null
  enrollmentId: string | null
  price: string
  originalPrice: string | null
  discountAmount: string | null
  discountLabel: string | null
  description: string
  descriptionEn: string | null
  createdAt: string
  childItems?: CartItemData[]
  student?: { id: string; name: string; nameEn: string | null } | null
}

interface CartContextType {
  items: CartItemData[]
  rootItems: CartItemData[]
  itemCount: number
  total: number
  loading: boolean
  refreshCart: (force?: boolean) => Promise<void>
  addToCart: (payload: AddToCartPayload) => Promise<{ ok: boolean; error?: string }>
  removeItem: (cartItemId: string) => Promise<void>
  clearCart: () => Promise<void>
}

interface AddToCartPayload {
  type: 'ENROLLMENT' | 'EXAM_REGISTRATION'
  studentId?: string
  classIds?: string[]
  textbookIds?: string[]
  examSessionId?: string
}

const CartContext = createContext<CartContextType>({
  items: [], rootItems: [], itemCount: 0, total: 0, loading: false,
  refreshCart: async () => {},
  addToCart: async () => ({ ok: false }),
  removeItem: async () => {},
  clearCart: async () => {},
})

const CACHE_MS = 30_000

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [items, setItems] = useState<CartItemData[]>([])
  const [loading, setLoading] = useState(false)
  const lastFetchRef = useRef<number>(0)

  const refreshCart = useCallback(async (force = false) => {
    if (!session) return
    const now = Date.now()
    if (!force && now - lastFetchRef.current < CACHE_MS) return
    setLoading(true)
    try {
      const res = await fetch('/api/cart')
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setItems(json.data)
          lastFetchRef.current = Date.now()
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [session])

  useEffect(() => {
    if (session) refreshCart()
  }, [session, refreshCart])

  async function addToCart(payload: AddToCartPayload): Promise<{ ok: boolean; error?: string }> {
    setLoading(true)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        setItems(json.data)
        lastFetchRef.current = Date.now()
        return { ok: true }
      }
      return { ok: false, error: json.error }
    } catch {
      return { ok: false, error: 'Network error' }
    } finally {
      setLoading(false)
    }
  }

  async function removeItem(cartItemId: string) {
    setItems(prev => prev.filter(i => i.id !== cartItemId && i.parentCartItemId !== cartItemId))
    try {
      const res = await fetch(`/api/cart/${cartItemId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setItems(json.data)
        lastFetchRef.current = Date.now()
      }
    } catch { await refreshCart(true) }
  }

  async function clearCart() {
    setItems([])
    lastFetchRef.current = Date.now()
    try { await fetch('/api/cart', { method: 'DELETE' }) } catch { /* silent */ }
  }

  const rootItems = items.filter(i => !i.parentCartItemId)
  const itemCount = rootItems.length
  const total = items.reduce((sum, i) => sum + parseFloat(i.price), 0)

  return (
    <CartContext.Provider value={{ items, rootItems, itemCount, total, loading, refreshCart, addToCart, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
