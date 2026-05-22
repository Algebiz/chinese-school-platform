"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LegalFooter } from "@/components/LegalFooter"

const schema = z
  .object({
    name: z.string().min(1, "请输入家长姓名"),
    email: z.string().email("请输入有效的电子邮件"),
    password: z.string().min(8, "密码至少需要8位字符"),
    confirmPassword: z.string(),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次密码输入不一致",
    path: ["confirmPassword"],
  })

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setServerError(null)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setServerError(
          json.code === "EMAIL_EXISTS" ? "该邮箱已被注册" : "注册失败，请重试"
        )
        return
      }
      router.push("/login?registered=true")
    } catch {
      setServerError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex flex-1 items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">创建账号</h1>
          <p className="mt-1 text-sm text-gray-500">Create Account</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              家长姓名 <span className="text-gray-400 text-xs">/ Parent Name</span>
            </label>
            <input
              {...register("name")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              电子邮件 <span className="text-gray-400 text-xs">/ Email</span>
            </label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              密码 <span className="text-gray-400 text-xs">/ Password</span>
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
              确认密码 <span className="text-gray-400 text-xs">/ Confirm Password</span>
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

          <div>
            <label className="block text-sm font-medium text-gray-700">
              手机号码{" "}
              <span className="text-gray-400 text-xs">/ Phone Number (optional)</span>
            </label>
            <input
              {...register("phone")}
              type="tel"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "注册中..." : "注册 / Register"}
          </button>

          <p className="text-center text-xs text-gray-500">
            By creating an account, you agree to our{" "}
            <Link href="/terms-of-use" className="underline hover:text-gray-700">
              Terms of Use
            </Link>
            {" "}and{" "}
            <Link href="/privacy-policy" className="underline hover:text-gray-700">
              Privacy Policy
            </Link>
            .
          </p>

          <p className="text-center text-sm text-gray-600">
            已有账号？{" "}
            <Link href="/login" className="font-medium text-red-600 hover:text-red-500">
              立即登录 / Sign In
            </Link>
          </p>
        </form>
      </div>
      </div>
      <LegalFooter />
    </div>
  )
}
