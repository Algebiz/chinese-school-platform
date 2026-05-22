'use client'

import { useState } from 'react'
import * as T from '@radix-ui/react-toast'

export interface ToastState {
  message: string
  variant: 'success' | 'error'
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  return {
    toast,
    showToast: (message: string, variant: 'success' | 'error' = 'success') =>
      setToast({ message, variant }),
    dismissToast: () => setToast(null),
  }
}

export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  return (
    <T.Provider swipeDirection="right" duration={3500}>
      <T.Root
        open={toast !== null}
        onOpenChange={(open) => { if (!open) onDismiss() }}
        className={`flex items-center gap-2 rounded-lg px-4 py-3 shadow-xl text-sm font-medium text-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 ${
          toast?.variant === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}
      >
        <T.Title className="flex items-center gap-2">
          <span>{toast?.variant === 'error' ? '❌' : '✅'}</span>
          <span>{toast?.message}</span>
        </T.Title>
        <T.Close className="ml-3 opacity-70 hover:opacity-100 text-xs">✕</T.Close>
      </T.Root>
      <T.Viewport className="fixed bottom-4 right-4 z-[100] flex w-auto max-w-sm flex-col gap-2 outline-none" />
    </T.Provider>
  )
}
