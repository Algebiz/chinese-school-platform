'use client'

import { useState, useRef } from 'react'

interface PhotoUploadProps {
  onUploadComplete: (url: string) => void
  onUploadError: (error: string) => void
}

export function PhotoUpload({ onUploadComplete, onUploadError }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setFileName(file.name)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/volunteer/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Upload failed')
      }

      onUploadComplete(data.url)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Upload failed'
      onUploadError(msg)
      setPreview(null)
      setFileName(null)
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    setPreview(null)
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onUploadComplete('')
  }

  return (
    <div>
      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-red-500"
        >
          <div className="mb-2 text-3xl">📷</div>
          <p className="text-sm font-medium text-gray-700">
            点击上传照片 / Click to upload photo
          </p>
          <p className="mt-1 text-xs text-gray-400">
            支持 JPG, PNG, HEIC, WebP 格式
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Upload preview"
            className="h-48 w-full rounded-lg border border-gray-200 object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-sm text-white">
              上传中... / Uploading...
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-black/80"
            >
              ×
            </button>
          )}
          <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
            {uploading ? (
              '⏳ 上传中...'
            ) : (
              <>
                <span className="text-green-600">✅ 上传成功 / Upload successful</span>
                {fileName && <span className="text-gray-400">— {fileName}</span>}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
