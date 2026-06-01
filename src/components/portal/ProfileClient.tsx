'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getYearsAtCCA, getYearsLabel } from '@/lib/student-utils'
import { badge } from '@/lib/design'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileStudent {
  id: string
  name: string
  nameEn: string | null
  birthDate: string | null
  grade: string | null
  notes: string | null
  firstEnrollmentYear: string | null
}

interface ProfileFamily {
  id: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  students: ProfileStudent[]
}

export interface ProfileData {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string
  createdAt: string
  family: ProfileFamily | null
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = { border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white', marginBottom: 16 }
const CARD_HEADER: React.CSSProperties = { padding: '14px 20px', borderBottom: '0.5px solid #E5E7EB', background: '#F9FAFB' }
const CARD_BODY: React.CSSProperties = { padding: '20px' }
const INPUT: React.CSSProperties = { width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#111827', outline: 'none', boxSizing: 'border-box' }
const LABEL: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 6 }
const GRID2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }
const BTN_PRIMARY: React.CSSProperties = { padding: '8px 20px', borderRadius: 6, background: '#CC0000', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const BTN_OUTLINE: React.CSSProperties = { padding: '8px 16px', borderRadius: 6, background: 'white', color: '#374151', border: '0.5px solid #E5E7EB', fontSize: 13, cursor: 'pointer' }

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '12px 20px', borderRadius: 8, background: ok ? '#EAF3DE' : '#FCEBEB', color: ok ? '#3B6D11' : '#A32D2D', fontSize: 13, fontWeight: 500, border: `0.5px solid ${ok ? '#BBF7D0' : '#FCA5A5'}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      {msg}
    </div>
  )
}

// ── Student Edit Modal ────────────────────────────────────────────────────────

function StudentEditModal({ student, onClose, onSaved }: { student: ProfileStudent; onClose: () => void; onSaved: (s: ProfileStudent) => void }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({
    name: student.name,
    nameEn: student.nameEn ?? '',
    birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
    grade: student.grade ?? '',
    notes: student.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!form.name.trim()) { setError(t('请输入学生姓名', 'Please enter student name')); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/user/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, nameEn: form.nameEn, birthDate: form.birthDate || null, grade: form.grade, notes: form.notes }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? t('保存失败', 'Save failed')); return }
      onSaved({ ...student, ...form, nameEn: form.nameEn || null, grade: form.grade || null, notes: form.notes || null, birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null })
      onClose()
    } catch { setError(t('网络错误，请重试', 'Network error')) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 480, borderRadius: 12, background: 'white', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{t('编辑学生信息', 'Edit Student')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af' }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#FCEBEB', border: '0.5px solid #FCA5A5', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#A32D2D' }}>{error}</div>}
          {[
            { label: t('中文姓名', 'Chinese Name'), key: 'name', required: true },
            { label: t('英文姓名', 'English Name'), key: 'nameEn' },
            { label: t('年级', 'Grade'), key: 'grade', placeholder: 'e.g. 3rd Grade' },
          ].map(({ label, key, required, placeholder }) => (
            <div key={key}>
              <label style={LABEL}>{label}{required && <span style={{ color: '#CC0000' }}> *</span>}</label>
              <input style={INPUT} required={required} placeholder={placeholder} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label style={LABEL}>{t('出生日期', 'Date of Birth')}</label>
            <input type="date" style={INPUT} value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
          </div>
          <div>
            <label style={LABEL}>{t('备注', 'Notes')}</label>
            <textarea style={{ ...INPUT, resize: 'none' as const }} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={BTN_OUTLINE}>{t('取消', 'Cancel')}</button>
          <button onClick={handleSave} disabled={saving} style={{ ...BTN_PRIMARY, opacity: saving ? 0.6 : 1 }}>
            {saving ? t('保存中…', 'Saving…') : t('保存', 'Save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Student Modal (reuse from enroll flow pattern) ────────────────────────

function AddStudentModal({ onClose, onAdded }: { onClose: () => void; onAdded: (s: ProfileStudent) => void }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({ name: '', nameEn: '', birthDate: '', grade: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!form.name.trim()) { setError(t('请输入学生姓名', 'Please enter student name')); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? t('添加失败', 'Add failed')); return }
      onAdded({ ...json.data, firstEnrollmentYear: null, birthDate: json.data.birthDate ?? null })
      onClose()
    } catch { setError(t('网络错误，请重试', 'Network error')) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 480, borderRadius: 12, background: 'white', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{t('添加学生', 'Add Student')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af' }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#FCEBEB', border: '0.5px solid #FCA5A5', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#A32D2D' }}>{error}</div>}
          {[
            { label: t('中文姓名', 'Chinese Name'), key: 'name', required: true },
            { label: t('英文姓名', 'English Name'), key: 'nameEn' },
            { label: t('年级', 'Grade'), key: 'grade', placeholder: 'e.g. 3rd Grade' },
          ].map(({ label, key, required, placeholder }) => (
            <div key={key}>
              <label style={LABEL}>{label}{required && <span style={{ color: '#CC0000' }}> *</span>}</label>
              <input style={INPUT} required={required} placeholder={placeholder} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label style={LABEL}>{t('出生日期', 'Date of Birth')}</label>
            <input type="date" style={INPUT} value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={BTN_OUTLINE}>{t('取消', 'Cancel')}</button>
          <button onClick={handleSave} disabled={saving} style={{ ...BTN_PRIMARY, opacity: saving ? 0.6 : 1 }}>
            {saving ? t('添加中…', 'Adding…') : t('添加', 'Add')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ProfileClient ────────────────────────────────────────────────────────

export function ProfileClient({ profile }: { profile: ProfileData }) {
  const { t, lang } = useLanguage()
  const router = useRouter()

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // Personal info state
  const [name, setName] = useState(profile.name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [savingInfo, setSavingInfo] = useState(false)

  // Address state
  const fam = profile.family
  const [address, setAddress] = useState(fam?.address ?? '')
  const [city, setCity] = useState(fam?.city ?? '')
  const [state, setState] = useState(fam?.state ?? 'NC')
  const [zipCode, setZipCode] = useState(fam?.zipCode ?? '')
  const [savingAddr, setSavingAddr] = useState(false)

  // Password state
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)

  // Students state
  const [students, setStudents] = useState<ProfileStudent[]>(profile.family?.students ?? [])
  const [editStudent, setEditStudent] = useState<ProfileStudent | null>(null)
  const [showAddStudent, setShowAddStudent] = useState(false)

  async function saveInfo() {
    setSavingInfo(true)
    try {
      const res = await fetch('/api/user/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) })
      const json = await res.json()
      if (json.success) { showToast(t('个人信息已更新', 'Personal info updated')); router.refresh() }
      else showToast(json.error ?? t('保存失败', 'Save failed'), false)
    } catch { showToast(t('网络错误', 'Network error'), false) }
    finally { setSavingInfo(false) }
  }

  async function saveAddress() {
    setSavingAddr(true)
    try {
      const res = await fetch('/api/user/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, city, state, zipCode }) })
      const json = await res.json()
      if (json.success) showToast(t('地址已更新', 'Address updated'))
      else showToast(json.error ?? t('保存失败', 'Save failed'), false)
    } catch { showToast(t('网络错误', 'Network error'), false) }
    finally { setSavingAddr(false) }
  }

  async function savePassword() {
    if (newPwd !== confirmPwd) { showToast(t('两次密码不一致', 'Passwords do not match'), false); return }
    if (newPwd.length < 8) { showToast(t('新密码至少8位', 'New password must be at least 8 characters'), false); return }
    setSavingPwd(true)
    try {
      const res = await fetch('/api/user/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }) })
      const json = await res.json()
      if (json.success) { showToast(t('密码已更新', 'Password updated')); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('') }
      else showToast(json.error ?? t('密码更新失败', 'Password update failed'), false)
    } catch { showToast(t('网络错误', 'Network error'), false) }
    finally { setSavingPwd(false) }
  }

  const ROLE_LABEL: Record<string, string> = {
    PARENT: t('家长', 'Parent'),
    TEACHER: t('教师', 'Teacher'),
    ADMIN: t('管理员', 'Admin'),
    SUPER_ADMIN: t('超级管理员', 'Super Admin'),
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Account Info */}
      <div style={CARD}>
        <div style={CARD_HEADER}><span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{t('账号信息', 'Account Info')}</span></div>
        <div style={CARD_BODY}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: t('邮箱', 'Email'), value: profile.email },
              { label: t('账号创建时间', 'Member since'), value: new Date(profile.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>{label}</span>
                <span style={{ color: '#111827', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{t('角色', 'Role')}</span>
              <span style={{ ...badge('blue'), fontSize: 11 }}>{ROLE_LABEL[profile.role] ?? profile.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div style={CARD}>
        <div style={CARD_HEADER}><span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{t('个人信息', 'Personal Info')}</span></div>
        <div style={CARD_BODY}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={LABEL}>{t('家长姓名', 'Parent Name')}</label>
              <input style={INPUT} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={LABEL}>{t('联系电话', 'Phone')}</label>
              <input style={INPUT} type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <button onClick={saveInfo} disabled={savingInfo} style={{ ...BTN_PRIMARY, opacity: savingInfo ? 0.6 : 1 }}>
                {savingInfo ? t('保存中…', 'Saving…') : t('保存', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div style={CARD}>
        <div style={CARD_HEADER}><span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{t('家庭地址', 'Home Address')}</span></div>
        <div style={CARD_BODY}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={LABEL}>{t('街道地址', 'Street Address')}</label>
              <input style={INPUT} value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" />
            </div>
            <div style={GRID2}>
              <div>
                <label style={LABEL}>{t('城市', 'City')}</label>
                <input style={INPUT} value={city} onChange={e => setCity(e.target.value)} placeholder="Charlotte" />
              </div>
              <div>
                <label style={LABEL}>{t('州', 'State')}</label>
                <input style={INPUT} value={state} onChange={e => setState(e.target.value)} placeholder="NC" />
              </div>
            </div>
            <div style={{ maxWidth: 160 }}>
              <label style={LABEL}>{t('邮编', 'ZIP Code')}</label>
              <input style={INPUT} value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="28201" />
            </div>
            <div>
              <button onClick={saveAddress} disabled={savingAddr} style={{ ...BTN_PRIMARY, opacity: savingAddr ? 0.6 : 1 }}>
                {savingAddr ? t('保存中…', 'Saving…') : t('保存地址', 'Save Address')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* My Students */}
      <div style={CARD}>
        <div style={{ ...CARD_HEADER, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{t('我的学生', 'My Students')} ({students.length})</span>
        </div>
        <div>
          {students.map((s, i) => {
            const years = getYearsAtCCA(s.firstEnrollmentYear)
            const yearsLabel = getYearsLabel(years, lang)
            const isLast = i === students.length - 1
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: isLast ? 'none' : '0.5px solid #E5E7EB' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#CC0000', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {s.name.substring(0, 1)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{s.name}</span>
                    {s.nameEn && <span style={{ fontSize: 12, color: '#9ca3af' }}>{s.nameEn}</span>}
                    {s.firstEnrollmentYear && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#FAEEDA', color: '#BA7517', fontWeight: 500 }}>
                        {yearsLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, display: 'flex', gap: 10 }}>
                    {s.birthDate && <span>{new Date(s.birthDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                    {s.grade && <span>{s.grade}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setEditStudent(s)}
                  style={{ ...BTN_OUTLINE, fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
                >
                  {t('编辑', 'Edit')}
                </button>
              </div>
            )
          })}
        </div>
        <div style={{ padding: '12px 20px', borderTop: students.length > 0 ? '0.5px solid #E5E7EB' : 'none' }}>
          <button onClick={() => setShowAddStudent(true)} style={{ ...BTN_OUTLINE, fontSize: 13 }}>
            + {t('添加学生', 'Add Student')}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div style={CARD}>
        <div style={CARD_HEADER}><span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{t('修改密码', 'Change Password')}</span></div>
        <div style={CARD_BODY}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: t('当前密码', 'Current Password'), val: currentPwd, set: setCurrentPwd, id: 'cur' },
              { label: t('新密码', 'New Password'), val: newPwd, set: setNewPwd, id: 'new' },
              { label: t('确认新密码', 'Confirm New Password'), val: confirmPwd, set: setConfirmPwd, id: 'conf' },
            ].map(({ label, val, set, id }) => (
              <div key={id}>
                <label style={LABEL}>{label}</label>
                <input type="password" style={INPUT} value={val} onChange={e => set(e.target.value)} autoComplete="new-password" />
              </div>
            ))}
            <div>
              <button onClick={savePassword} disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd} style={{ ...BTN_PRIMARY, opacity: savingPwd || !currentPwd || !newPwd || !confirmPwd ? 0.6 : 1 }}>
                {savingPwd ? t('更新中…', 'Updating…') : t('更新密码', 'Update Password')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {editStudent && (
        <StudentEditModal
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSaved={updated => {
            setStudents(prev => prev.map(s => s.id === updated.id ? updated : s))
            setEditStudent(null)
            showToast(t('学生信息已更新', 'Student info updated'))
          }}
        />
      )}
      {showAddStudent && (
        <AddStudentModal
          onClose={() => setShowAddStudent(false)}
          onAdded={s => {
            setStudents(prev => [...prev, s])
            setShowAddStudent(false)
            showToast(t('学生已添加', 'Student added'))
          }}
        />
      )}

      <style>{`@media (max-width: 480px) { [data-grid2] { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
