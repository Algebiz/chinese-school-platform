"use client"

import { useState, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

const schema = z
  .object({
    password: z.string().min(8, "密码至少需要8位字符"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "两次密码输入不一致",
    path: ["confirmPassword"],
  })

type FormData = z.infer<typeof schema>

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  if (!token) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-red-800 font-medium">无效的重置链接 / Invalid reset link</p>
        <p className="mt-1 text-sm text-red-700">
          This link is missing a token. Please request a new password reset.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-red-600 hover:text-red-500"
        >
          重新发送重置链接 / Request New Link
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-md bg-green-50 border border-green-200 p-6 text-center">
        <p className="text-green-800 font-medium">密码已重置成功！</p>
        <p className="mt-1 text-sm text-green-700">
          Your password has been reset successfully. You can now sign in.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          前往登录 / Go to Sign In
        </button>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      })
      const json = await res.json()
      if (!json.success) {
        const msg =
          json.code === "TOKEN_EXPIRED"
            ? "重置链接已过期，请重新申请 / Link expired, please request a new one"
            : json.code === "INVALID_TOKEN"
            ? "无效的重置链接 / Invalid reset link"
            : "重置失败，请重试 / Reset failed, please try again"
        setError(msg)
        return
      }
      setDone(true)
    } catch {
      setError("网络错误，请重试 / Network error, please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          新密码 <span className="text-gray-400 text-xs">/ New Password</span>
        </label>
        <input
          {...register("password")}
          type="password"
          autoComplete="new-password"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          确认新密码 <span className="text-gray-400 text-xs">/ Confirm New Password</span>
        </label>
        <input
          {...register("confirmPassword")}
          type="password"
          autoComplete="new-password"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "重置中..." : "重置密码 / Reset Password"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">重置密码</h1>
          <p className="mt-1 text-sm text-gray-500">Reset Password</p>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-gray-400">加载中…</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
