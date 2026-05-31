'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LegalFooter } from '@/components/LegalFooter'
import { LanguageToggle } from '@/components/LanguageToggle'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type FormData = z.infer<typeof schema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get('registered') === 'true'
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
      callbackUrl: '/dashboard',
    })
    setLoading(false)

    if (result?.error) {
      setError(t('邮箱或密码错误，请重试', 'Invalid email or password, please try again'))
      return
    }

    const session = await getSession()
    const role = session?.user?.role
    const destination =
      role === 'ADMIN' || role === 'SUPER_ADMIN' ? '/admin' :
      role === 'TEACHER' ? '/teacher/classes' :
      '/dashboard'
    router.push(destination)
    router.refresh()
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('登录账号', 'Sign In')}</h1>
      </div>

      {justRegistered && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {t('注册成功，请登录', 'Registration successful, please sign in')}
        </div>
      )}

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700">{t('电子邮件', 'Email')}</label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{t('请输入有效的电子邮件', 'Please enter a valid email')}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">{t('密码', 'Password')}</label>
            <Link href="/forgot-password" className="text-xs text-red-600 hover:text-red-500">
              {t('忘记密码？', 'Forgot password?')}
            </Link>
          </div>
          <input
            {...register('password')}
            type="password"
            autoComplete="current-password"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{t('请输入密码', 'Please enter your password')}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('登录中...', 'Signing in...') : t('登录', 'Sign In')}
        </button>

        <p className="text-center text-sm text-gray-600">
          {t('还没有账号？', "Don't have an account?")}{' '}
          <Link href="/register" className="font-medium text-red-600 hover:text-red-500">
            {t('立即注册', 'Register')}
          </Link>
        </p>
      </form>
    </div>
  )
}

export function LoginClient() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex flex-1 items-center justify-center py-12 px-4">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <LegalFooter />
    </div>
  )
}
