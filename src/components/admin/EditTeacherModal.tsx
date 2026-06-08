'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export interface TeacherForEdit {
  id: string
  name: string
  nameEn: string | null
  bioEn: string | null
  bioZh: string | null
  photoUrl: string | null
  userId: string | null
  linkedEmail: string | null
  linkedName: string | null
}

interface UserResult {
  id: string
  name: string | null
  email: string
  role: string
}

interface Props {
  teacher: TeacherForEdit
  onClose: () => void
}

export function EditTeacherModal({ teacher, onClose }: Props) {
  const router = useRouter()
  const { t } = useLanguage()
  const [name, setName] = useState(teacher.name ?? '')
  const [nameEn, setNameEn] = useState(teacher.nameEn ?? '')
  const [photoUrl, setPhotoUrl] = useState(teacher.photoUrl ?? '')
  const [bioEn, setBioEn] = useState(teacher.bioEn ?? '')
  const [bioZh, setBioZh] = useState(teacher.bioZh ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Link user state
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linkMsg, setLinkMsg] = useState<string | null>(null)
  const [linkedUserId, setLinkedUserId] = useState<string | null>(teacher.userId)
  const [linkedEmail, setLinkedEmail] = useState<string | null>(teacher.linkedEmail)
  const [linkedName, setLinkedName] = useState<string | null>(teacher.linkedName)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function searchUsers(q: string) {
    if (!q.trim()) { setSearchResults(null); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}`)
      const json = await res.json()
      setSearchResults(json.success ? json.data : [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleSearchChange(v: string) {
    setUserSearch(v)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchUsers(v), 400)
  }

  async function handleLink(user: UserResult) {
    setLinking(true)
    setLinkMsg(null)
    try {
      const res = await fetch(`/api/admin/teachers/${teacher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const json = await res.json()
      if (!json.success) { setLinkMsg(json.error ?? 'Link failed'); return }
      setLinkedUserId(user.id)
      setLinkedEmail(user.email)
      setLinkedName(user.name)
      setUserSearch('')
      setSearchResults(null)
      setLinkMsg('已关联账号并设置为教师角色 / Account linked and role set to TEACHER')
      router.refresh()
    } catch {
      setLinkMsg('Network error')
    } finally {
      setLinking(false)
    }
  }

  async function handleUnlink() {
    if (!confirm('确认解除账号关联？用户角色将恢复为家长。\nRemove account link? User role will revert to PARENT.')) return
    setLinking(true)
    setLinkMsg(null)
    try {
      const res = await fetch(`/api/admin/teachers/${teacher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: null }),
      })
      const json = await res.json()
      if (!json.success) { setLinkMsg(json.error ?? 'Unlink failed'); return }
      setLinkedUserId(null)
      setLinkedEmail(null)
      setLinkedName(null)
      setLinkMsg('已解除关联，用户角色已恢复为家长 / Account unlinked, role reverted to PARENT')
      router.refresh()
    } catch {
      setLinkMsg('Network error')
    } finally {
      setLinking(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/teachers/${teacher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nameEn, bioEn, bioZh, photoUrl }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? 'Save failed')
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('Network error, please retry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">编辑教师 / Edit Teacher</h2>
            <p className="text-sm text-gray-500">{teacher.name}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600" aria-label="Close">✕</button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Chinese name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('中文姓名', 'Chinese Name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('请输入中文姓名', 'Chinese name')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* English name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('英文姓名', 'English Name')}</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Xue Li"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Photo URL */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Photo URL</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="preview" className="h-10 w-10 rounded-full object-cover border border-gray-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
            </div>
          </div>

          {/* Bio English */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Bio (English)</label>
            <textarea value={bioEn} onChange={(e) => setBioEn(e.target.value)} rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>

          {/* Bio Chinese */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">简介（中文）</label>
            <textarea value={bioZh} onChange={(e) => setBioZh(e.target.value)} rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {/* Link User Account section */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">
              关联用户账号 / Link User Account
            </h3>

            {linkedUserId ? (
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    ✅ {linkedName ?? '—'} — {linkedEmail}
                  </p>
                  <p className="text-xs text-green-700">Role: TEACHER</p>
                </div>
                <button
                  onClick={handleUnlink}
                  disabled={linking}
                  className="rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {linking ? '…' : '清除关联 / Remove Link'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">⚠️ 未关联 / Not linked — 教师无法登录门户</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="按姓名或邮箱搜索用户… / Search by name or email…"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                {searching && <p className="text-xs text-gray-400">搜索中… / Searching…</p>}
                {searchResults && searchResults.length === 0 && (
                  <p className="text-xs text-gray-400">无匹配用户 / No users found</p>
                )}
                {searchResults && searchResults.length > 0 && (
                  <div className="rounded-md border border-gray-200 divide-y divide-gray-100 bg-white shadow-sm max-h-40 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleLink(u)}
                        disabled={linking}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="text-sm text-gray-900">{u.name ?? '—'} — {u.email}</span>
                        <span className="text-xs text-gray-400 ml-2">{u.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {linkMsg && (
              <p className={`mt-2 text-sm ${linkMsg.includes('failed') || linkMsg.includes('error') ? 'text-red-600' : 'text-green-700'}`}>
                {linkMsg}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            取消 / Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {saving ? '保存中…' : '保存 / Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
