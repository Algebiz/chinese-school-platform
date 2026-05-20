"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"

const schema = z.object({
  email: z.string().email("请输入有效的电子邮件"),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      })
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">找回密码</h1>
          <p className="mt-1 text-sm text-gray-500">Forgot Password</p>
        </div>

        {sent ? (
          <div className="rounded-md bg-green-50 border border-green-200 p-6 text-center">
            <p className="text-green-800 font-medium">
              如果该邮箱已注册，重置链接已发送
            </p>
            <p className="mt-1 text-sm text-green-700">
              If this email is registered, a reset link has been sent. Please check your inbox.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-red-600 hover:text-red-500"
            >
              ← 返回登录 / Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <p className="text-sm text-gray-600">
              输入您注册时使用的邮箱，我们将向您发送密码重置链接。
              <br />
              <span className="text-gray-400 text-xs">
                Enter your registered email and we'll send you a reset link.
              </span>
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                电子邮件 <span className="text-gray-400 text-xs">/ Email</span>
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                autoFocus
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "发送中..." : "发送重置链接 / Send Reset Link"}
            </button>

            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="font-medium text-red-600 hover:text-red-500">
                ← 返回登录 / Back to Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
