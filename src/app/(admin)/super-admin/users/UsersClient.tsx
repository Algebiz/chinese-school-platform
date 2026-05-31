'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  studentCount: number
  createdAt: string
}

interface Props {
  users: UserRow[]
  currentUserId: string
  superAdminCount: number
  page: number
  totalPages: number
  search: string
}

const ROLE_OPTIONS = ['PARENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'] as const

function RoleBadge({ role }: { role: string }) {
  if (role === 'SUPER_ADMIN') return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">SUPER_ADMIN</span>
  if (role === 'ADMIN') return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">ADMIN</span>
  if (role === 'TEACHER') return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">TEACHER</span>
  return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">PARENT</span>
}

export function UsersClient({ users, currentUserId, superAdminCount, page, totalPages, search }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleRoleChange(user: UserRow, newRole: string) {
    if (newRole === user.role) return
    const label = `${user.name ?? user.email}: ${user.role} → ${newRole}`
    if (!confirm(`确认修改角色？\n${label}\n\nConfirm role change?`)) return
    setActionLoading(`role-${user.id}`)
    try {
      const res = await fetch(`/api/super-admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const json = await res.json()
      if (!json.success) showToast(json.error ?? '角色修改失败', false)
      else { showToast('角色已更新 / Role updated'); startTransition(() => router.refresh()) }
    } catch {
      showToast('网络错误，请重试', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleResetPassword(user: UserRow) {
    if (!confirm(`向 ${user.email} 发送密码重置邮件？\n\nSend password reset email to ${user.email}?`)) return
    setActionLoading(`reset-${user.id}`)
    try {
      const res = await fetch(`/api/super-admin/users/${user.id}/reset-password`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) showToast(json.error ?? '发送失败', false)
      else showToast('重置邮件已发送 / Reset email sent')
    } catch {
      showToast('网络错误，请重试', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(user: UserRow) {
    setActionLoading(`delete-${user.id}`)
    setDeleteTarget(null)
    try {
      const res = await fetch(`/api/super-admin/users/${user.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) showToast(json.error ?? '删除失败', false)
      else { showToast('用户已删除 / User deleted'); startTransition(() => router.refresh()) }
    } catch {
      showToast('网络错误，请重试', false)
    } finally {
      setActionLoading(null)
    }
  }

  function buildUrl(params: { page?: number; search?: string }) {
    const sp = new URLSearchParams()
    if (params.search !== undefined && params.search) sp.set('search', params.search)
    if (params.page && params.page > 1) sp.set('page', String(params.page))
    return `/super-admin/users${sp.toString() ? `?${sp}` : ''}`
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Search bar */}
      <form method="GET" action="/super-admin/users" className="mb-5 flex gap-2">
        <input
          name="search"
          defaultValue={search}
          placeholder="搜索姓名或邮箱 / Search by name or email…"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <button type="submit" className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
          搜索 / Search
        </button>
        {search && (
          <a href="/super-admin/users" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            清除 / Clear
          </a>
        )}
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-gray-500">用户 / User</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">角色 / Role</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">学生 / Students</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">加入时间 / Joined</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">操作 / Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">没有找到用户 / No users found</td></tr>
            )}
            {users.map((user) => {
              const isMe = user.id === currentUserId
              const isLastSA = user.role === 'SUPER_ADMIN' && superAdminCount <= 1
              const roleLoading = actionLoading === `role-${user.id}`
              const resetLoading = actionLoading === `reset-${user.id}`
              const deleteLoading = actionLoading === `delete-${user.id}`
              const anyLoading = roleLoading || resetLoading || deleteLoading
              return (
                <tr key={user.id} className={`hover:bg-gray-50 ${isMe ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{user.name ?? '—'} {isMe && <span className="text-xs text-blue-500">(你/You)</span>}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    {isMe ? (
                      <RoleBadge role={user.role} />
                    ) : (
                      <select
                        value={user.role}
                        disabled={anyLoading || (isLastSA)}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                    {roleLoading && <span className="ml-2 text-xs text-gray-400">保存中…</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{user.studentCount}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetPassword(user)}
                        disabled={anyLoading}
                        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {resetLoading ? '发送中…' : '重置密码'}
                      </button>
                      {!isMe && !isLastSA && (
                        <button
                          onClick={() => setDeleteTarget(user)}
                          disabled={anyLoading}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deleteLoading ? '删除中…' : '删除'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <a href={buildUrl({ page: page - 1, search })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              ← 上一页
            </a>
          )}
          <span className="text-sm text-gray-500">第 {page} / {totalPages} 页</span>
          {page < totalPages && (
            <a href={buildUrl({ page: page + 1, search })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              下一页 →
            </a>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">确认删除用户 / Confirm Delete</h2>
            <p className="mt-2 text-sm text-gray-600">
              确定要删除用户 <strong>{deleteTarget.name ?? deleteTarget.email}</strong> 吗？
              <br />此操作将删除该用户及其所有关联数据（家庭、学生、报名记录），<strong className="text-red-600">不可恢复</strong>。
            </p>
            <p className="mt-2 text-xs text-gray-400">
              This will permanently delete the user and all associated family/student/enrollment data.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-md border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50">
                取消 / Cancel
              </button>
              <button onClick={() => handleDelete(deleteTarget)}
                className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700">
                确认删除 / Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
