'use client'

import { useState, useEffect } from 'react'

interface ClassOption {
  id: string
  name: string
  type: string
}

function DownloadButton({
  href,
  label,
  sublabel,
}: {
  href: string
  label: string
  sublabel: string
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5 hover:border-red-300 hover:bg-red-50 transition-colors group"
    >
      <div>
        <p className="font-semibold text-gray-900 group-hover:text-red-700">{label}</p>
        <p className="mt-0.5 text-sm text-gray-500">{sublabel}</p>
      </div>
      <span className="ml-4 shrink-0 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white group-hover:bg-red-700 transition-colors">
        下载 CSV
      </span>
    </a>
  )
}

export default function ExportPage() {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [loadingClasses, setLoadingClasses] = useState(true)

  useEffect(() => {
    fetch('/api/classes?academicYear=2025-2026')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setClasses(json.data)
      })
      .finally(() => setLoadingClasses(false))
  }, [])

  const rosterHref = selectedClassId
    ? `/api/admin/export?type=roster&classId=${selectedClassId}`
    : '#'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据导出</h1>
        <p className="mt-1 text-sm text-gray-500">
          Data Export · CSV files include UTF-8 BOM for Excel compatibility
        </p>
      </div>

      {/* All enrollments + payments */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">全量导出 / Bulk Export</h2>
        <div className="space-y-3">
          <DownloadButton
            href="/api/admin/export?type=all"
            label="所有报名记录 / All Enrollments"
            sublabel="当前学年全部已确认报名，含班级、学生、家长信息"
          />
          <DownloadButton
            href="/api/admin/export?type=payments"
            label="支付记录 / Payment Records"
            sublabel="所有已完成支付，含金额、方式、交易ID"
          />
        </div>
      </div>

      {/* Class roster */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">班级花名册 / Class Roster</h2>
        <p className="mb-4 text-sm text-gray-500">
          选择班级后下载该班所有已确认学生名单（含家长联系方式）
        </p>

        {loadingClasses ? (
          <p className="text-sm text-gray-400">加载班级列表… / Loading classes…</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                选择班级 / Select Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">— 请选择班级 —</option>
                <optgroup label="中文班 / Chinese Classes">
                  {classes
                    .filter((c) => c.type === 'CHINESE')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="才艺班 / Arts Classes">
                  {classes
                    .filter((c) => c.type === 'ARTS')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <a
              href={rosterHref}
              onClick={(e) => { if (!selectedClassId) e.preventDefault() }}
              className={`shrink-0 rounded-md px-6 py-2 text-sm font-medium text-white transition-colors ${
                selectedClassId
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'cursor-not-allowed bg-gray-300'
              }`}
            >
              下载花名册 CSV
            </a>
          </div>
        )}
      </div>

      {/* Format note */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">关于文件格式 / File Format</p>
        <p>
          所有 CSV 文件包含 UTF-8 BOM 标头，可直接用 Microsoft Excel 打开并正确显示中文。
          若用 Google Sheets，导入时选择 UTF-8 编码。
        </p>
      </div>
    </div>
  )
}
