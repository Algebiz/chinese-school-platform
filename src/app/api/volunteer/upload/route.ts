import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const fileName = `${session.user.id}/${timestamp}-${random}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await getSupabaseAdmin().storage
    .from('volunteer-proofs')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Signed URL valid for 1 year
  const { data: signedUrlData } = await getSupabaseAdmin().storage
    .from('volunteer-proofs')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365)

  return NextResponse.json({
    url: signedUrlData?.signedUrl,
    path: fileName,
  })
}
